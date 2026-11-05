/**
 * Carrinho: cada linha aponta para um orçamento guardado (preço fixo durante
 * o prazo de validade). O carrinho identifica-se por um código aleatório num
 * cookie; na BD guarda-se só o hash, para um dump da BD não dar acesso a carrinhos.
 */
import { createHash, randomBytes } from "node:crypto";
import { and, asc, count, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { cartItems, carts, categories, products, quotes } from "@/db/schema";
import { localize } from "@/lib/localized";
import { formatDecimal, vatCents } from "@/lib/money";
import { getSetting, getVatRate } from "@/server/settings";
import { type ChoiceSummary, priceConfiguration } from "./catalog";

export const CART_COOKIE = "habinox_cart";
export const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 60; // 60 dias
export const MAX_QUANTITY = 99;

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function newCartToken() {
  return randomBytes(32).toString("base64url");
}

export async function findCart(token: string | undefined) {
  if (!token || !TOKEN_PATTERN.test(token)) return null;
  const [cart] = await db
    .select()
    .from(carts)
    .where(eq(carts.tokenHash, hashToken(token)));
  return cart ?? null;
}

export async function createCart(token: string, userId: string | null = null) {
  const [cart] = await db
    .insert(carts)
    .values({ tokenHash: hashToken(token), userId })
    .returning();
  return cart!;
}

export async function cartItemCount(cartId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${cartItems.quantity}), 0)::int` })
    .from(cartItems)
    .where(eq(cartItems.cartId, cartId));
  return row?.total ?? 0;
}

interface QuoteSnapshot {
  format: 1;
  productName: string;
  summary: ChoiceSummary[];
  facts: { label: string; value: number }[];
  values: Record<string, unknown>;
  pricing: unknown;
  computedAt: string;
}

export type AddResult =
  | { ok: true; count: number }
  | { ok: false; reason: "not_found" | "invalid" | "unavailable" | "full" | "rate_limited" };

/** Calcula, guarda o orçamento e junta-o ao carrinho. */
export async function addToCart(
  cartId: string,
  productId: string,
  input: Record<string, unknown>,
  quantity: number,
  locale: string,
): Promise<AddResult> {
  const priced = await priceConfiguration(productId, input, locale);
  if (!priced) return { ok: false, reason: "not_found" };
  if (!priced.ok) return { ok: false, reason: priced.unavailable ? "unavailable" : "invalid" };

  const [product] = await db
    .select({ name: products.name })
    .from(products)
    .where(eq(products.id, productId));
  const { days } = await getSetting("quote_validity_days");
  const validUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const snapshot: QuoteSnapshot = {
    format: 1,
    productName: product ? localize(product.name, locale) : "",
    summary: priced.summary,
    facts: priced.facts,
    values: priced.values,
    pricing: priced.pricing,
    computedAt: new Date().toISOString(),
  };

  const result: AddResult = await db.transaction(async (tx) => {
    const [items] = await tx
      .select({ n: count() })
      .from(cartItems)
      .where(eq(cartItems.cartId, cartId));
    if ((items?.n ?? 0) >= 50) return { ok: false as const, reason: "full" as const };
    const [quote] = await tx
      .insert(quotes)
      .values({
        productId,
        productVersionId: priced.productVersionId,
        config: priced.values as Record<string, number | string | boolean>,
        netCents: priced.netCents,
        // numeric(5,4): "0.23000000" → "0.2300"
        vatRate: formatDecimal(priced.vatRate).slice(0, 6),
        vatCents: priced.vatCents,
        totalCents: priced.totalCents,
        snapshot,
        validUntil,
      })
      .returning({ id: quotes.id });
    await tx.insert(cartItems).values({
      cartId,
      quoteId: quote!.id,
      quantity: Math.min(Math.max(1, Math.trunc(quantity)), MAX_QUANTITY),
    });
    await tx.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));
    return { ok: true as const, count: 0 };
  });
  return result.ok ? { ok: true, count: await cartItemCount(cartId) } : result;
}

export interface CartLine {
  id: string;
  quantity: number;
  productName: string;
  productUrl: string | null;
  summary: ChoiceSummary[];
  facts: { label: string; value: number }[];
  /** Preço unitário em vigor (o guardado, ou o recalculado se o orçamento expirou). */
  unitNetCents: number | null;
  unitTotalCents: number | null;
  validUntil: Date;
  /** Orçamento expirado: o preço foi recalculado com os custos de hoje. */
  repriced: { previousTotalCents: number } | null;
  /** Já não se pode encomendar (produto retirado ou combinação já não possível). */
  unavailable: boolean;
}

export interface CartView {
  lines: CartLine[];
  netCents: number;
  vatRate: string;
  vatCents: number;
  totalCents: number;
}

/**
 * Linhas do carrinho com o preço em vigor. Um orçamento dentro do prazo mantém
 * o preço; um expirado é recalculado só para mostrar (grava-se ao encomendar).
 */
export async function getCartView(cartId: string, locale: string): Promise<CartView> {
  const rows = await db
    .select({
      item: cartItems,
      quote: quotes,
      productSlug: products.slug,
      productArchived: products.archivedAt,
      categorySlug: categories.slug,
    })
    .from(cartItems)
    .innerJoin(quotes, eq(quotes.id, cartItems.quoteId))
    .innerJoin(products, eq(products.id, quotes.productId))
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(eq(cartItems.cartId, cartId))
    .orderBy(asc(cartItems.createdAt));

  const now = Date.now();
  const lines: CartLine[] = [];
  for (const { item, quote, productSlug, productArchived, categorySlug } of rows) {
    const snapshot = quote.snapshot as QuoteSnapshot;
    let unitNetCents: number | null = quote.netCents;
    let unitTotalCents: number | null = quote.totalCents;
    let repriced: CartLine["repriced"] = null;
    let unavailable = productArchived !== null;

    if (!unavailable && quote.validUntil.getTime() < now) {
      const fresh = await priceConfiguration(quote.productId, quote.config, locale);
      if (fresh?.ok) {
        unitNetCents = fresh.netCents;
        unitTotalCents = fresh.totalCents;
        if (fresh.totalCents !== quote.totalCents) {
          repriced = { previousTotalCents: quote.totalCents };
        }
      } else {
        unavailable = true;
      }
    }
    if (unavailable) {
      unitNetCents = null;
      unitTotalCents = null;
    }

    lines.push({
      id: item.id,
      quantity: item.quantity,
      productName: snapshot.productName,
      productUrl: unavailable ? null : `/loja/${categorySlug}/${productSlug}`,
      summary: snapshot.summary,
      facts: snapshot.facts,
      unitNetCents,
      unitTotalCents,
      validUntil: quote.validUntil,
      repriced,
      unavailable,
    });
  }

  // IVA uma vez, ao total (as linhas mostram o preço com IVA só para apresentação).
  const netCents = lines.reduce((sum, line) => sum + (line.unitNetCents ?? 0) * line.quantity, 0);
  const rate = await getVatRate();
  const vat = vatCents(netCents, rate);
  return {
    lines,
    netCents,
    vatRate: formatDecimal(rate),
    vatCents: vat,
    totalCents: netCents + vat,
  };
}

export async function setItemQuantity(cartId: string, itemId: string, quantity: number) {
  const value = Math.min(Math.max(1, Math.trunc(quantity)), MAX_QUANTITY);
  await db
    .update(cartItems)
    .set({ quantity: value })
    .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
}

export async function removeItem(cartId: string, itemId: string) {
  await db.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
}
