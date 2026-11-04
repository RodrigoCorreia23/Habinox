/**
 * Transforma o carrinho numa encomenda, numa transação:
 * - o carrinho fica bloqueado (FOR UPDATE): dois cliques não fazem duas encomendas;
 * - orçamentos dentro do prazo mantêm o preço; os expirados são recalculados e
 *   gravados como orçamentos novos; qualquer linha indisponível trava tudo;
 * - IVA uma vez sobre o total; número legível pela sequência;
 * - consentimentos (termos, medidas) gravados com data; o carrinho fica vazio.
 * Os emails saem depois do commit e uma falha neles não desfaz a encomenda.
 */
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import {
  cartItems,
  carts,
  consents,
  orderEvents,
  orderItems,
  orders,
  products,
  quotes,
} from "@/db/schema";
import { type Address, addressSchema, isValidNif } from "@/lib/address";
import { formatDecimal, vatCents } from "@/lib/money";
import { log } from "@/lib/log";
import { sendEmail } from "@/server/email/send";
import { newOrderNoticeMessage, orderConfirmationMessage } from "@/server/email/templates";
import { getSetting, getVatRate } from "@/server/settings";
import { priceConfiguration } from "@/server/store/catalog";

export const checkoutInputSchema = z
  .object({
    phone: z
      .string()
      .trim()
      .regex(/^\+?[\d\s]{9,20}$/, "Escreva um telefone válido"),
    nif: z
      .string()
      .trim()
      .refine((value) => value === "" || isValidNif(value), "NIF inválido"),
    billing: addressSchema,
    sameShipping: z.boolean(),
    shipping: addressSchema.optional(),
    notes: z.string().trim().max(1000),
    acceptTerms: z.literal(true, { error: "Tem de aceitar os termos" }),
    acceptMeasures: z.literal(true, { error: "Tem de confirmar as medidas" }),
  })
  .refine((input) => input.sameShipping || input.shipping !== undefined, {
    path: ["shipping"],
    message: "Preencha a morada de entrega",
  });
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

export type PlaceResult =
  | { ok: true; number: string }
  | { ok: false; reason: "empty" | "unavailable" | "price_changed"; products?: string[] };

interface Snapshot {
  productName: string;
}

class PriceChanged extends Error {}

export async function placeOrder(params: {
  cartId: string;
  userId: string;
  email: string;
  input: CheckoutInput;
  locale: string;
  /** Total que o cliente viu no botão: se o preço mudou entretanto, não se encomenda. */
  expectedTotalCents: number;
}): Promise<PlaceResult> {
  const { cartId, userId, email, input, locale, expectedTotalCents } = params;
  const vatRate = await getVatRate();
  const { days } = await getSetting("quote_validity_days");

  const result = await db
    .transaction(async (tx): Promise<PlaceResult & { orderId?: string }> => {
      await tx.select({ id: carts.id }).from(carts).where(eq(carts.id, cartId)).for("update");
      const lines = await tx
        .select({ item: cartItems, quote: quotes, archivedAt: products.archivedAt })
        .from(cartItems)
        .innerJoin(quotes, eq(quotes.id, cartItems.quoteId))
        .innerJoin(products, eq(products.id, quotes.productId))
        .where(eq(cartItems.cartId, cartId))
        .orderBy(asc(cartItems.createdAt));
      if (lines.length === 0) return { ok: false, reason: "empty" };

      const now = new Date();
      const chosen: { quote: typeof quotes.$inferSelect; quantity: number }[] = [];
      const unavailable: string[] = [];
      for (const { item, quote, archivedAt } of lines) {
        const name = (quote.snapshot as Snapshot).productName;
        if (archivedAt) {
          unavailable.push(name);
          continue;
        }
        if (quote.validUntil > now) {
          chosen.push({ quote, quantity: item.quantity });
          continue;
        }
        // Orçamento expirado: novo preço com os custos de hoje, gravado como orçamento novo.
        const fresh = await priceConfiguration(quote.productId, quote.config, locale);
        if (!fresh?.ok) {
          unavailable.push(name);
          continue;
        }
        const [renewed] = await tx
          .insert(quotes)
          .values({
            productId: quote.productId,
            productVersionId: fresh.productVersionId,
            userId,
            config: fresh.values as Record<string, number | string | boolean>,
            netCents: fresh.netCents,
            vatRate: formatDecimal(fresh.vatRate).slice(0, 6),
            vatCents: fresh.vatCents,
            totalCents: fresh.totalCents,
            snapshot: {
              ...(quote.snapshot as object),
              summary: fresh.summary,
              facts: fresh.facts,
              values: fresh.values,
              pricing: fresh.pricing,
              computedAt: now.toISOString(),
            },
            validUntil: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
          })
          .returning();
        chosen.push({ quote: renewed!, quantity: item.quantity });
      }
      if (unavailable.length > 0)
        return { ok: false, reason: "unavailable", products: unavailable };

      // IVA uma vez, sobre o total sem IVA.
      const netCents = chosen.reduce((sum, line) => sum + line.quote.netCents * line.quantity, 0);
      const vat = vatCents(netCents, vatRate);
      if (netCents + vat !== expectedTotalCents) {
        // Rollback: os orçamentos renovados acima não ficam gravados.
        throw new PriceChanged();
      }
      const [{ seq } = { seq: 0 }] = await tx.execute<{ seq: number }>(
        sql`select nextval('order_number_seq')::int as seq`,
      );
      const number = `HBX-${now.getFullYear()}-${String(seq).padStart(5, "0")}`;
      const shipping: Address = input.sameShipping ? input.billing : input.shipping!;

      const [order] = await tx
        .insert(orders)
        .values({
          number,
          userId,
          netCents,
          vatRate: formatDecimal(vatRate).slice(0, 6),
          vatCents: vat,
          totalCents: netCents + vat,
          email,
          phone: input.phone.replace(/\s/g, ""),
          nif: input.nif ? input.nif.replace(/\s/g, "") : null,
          billingAddress: input.billing,
          shippingAddress: shipping,
          notes: input.notes || null,
          measuresAcceptedAt: now,
          termsAcceptedAt: now,
        })
        .returning({ id: orders.id });
      await tx.insert(orderItems).values(
        chosen.map((line, position) => ({
          orderId: order!.id,
          position,
          productId: line.quote.productId,
          productVersionId: line.quote.productVersionId,
          quoteId: line.quote.id,
          config: line.quote.config,
          quantity: line.quantity,
          unitNetCents: line.quote.netCents,
          snapshot: line.quote.snapshot,
        })),
      );
      await tx.insert(orderEvents).values({
        orderId: order!.id,
        fromStatus: null,
        toStatus: "pending_payment",
        actorUserId: userId,
      });
      await tx.insert(consents).values([
        { userId, type: "terms", granted: true, source: `order:${number}` },
        { userId, type: "measures_responsibility", granted: true, source: `order:${number}` },
      ]);
      await tx.delete(cartItems).where(eq(cartItems.cartId, cartId));
      await tx.update(carts).set({ userId, updatedAt: now }).where(eq(carts.id, cartId));
      return { ok: true, number, orderId: order!.id };
    })
    .catch((error: unknown) => {
      if (error instanceof PriceChanged)
        return { ok: false as const, reason: "price_changed" as const };
      throw error;
    });

  if (!result.ok) return result;
  log.info("order.placed", { orderId: result.orderId, number: result.number, userId });
  await notify(result.orderId!).catch((error: unknown) =>
    log.error("order.notify_failed", { orderId: result.orderId, error }),
  );
  return { ok: true, number: result.number };
}

async function notify(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return;
  const items = await db
    .select({
      quantity: orderItems.quantity,
      unitNetCents: orderItems.unitNetCents,
      snapshot: orderItems.snapshot,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .orderBy(asc(orderItems.position));
  const { email: staff } = await getSetting("orders_notify_email");
  await sendEmail(orderConfirmationMessage(order, items));
  await sendEmail(newOrderNoticeMessage(staff, order, items));
}
