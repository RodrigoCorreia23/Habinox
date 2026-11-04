"use server";

import { z } from "zod";
import { log } from "@/lib/log";
import { type QuoteResult, quoteProduct } from "@/server/store/catalog";

const inputSchema = z.record(
  z.string().regex(/^[a-z][a-z0-9_]*$/),
  z.union([z.string().max(80), z.number().finite(), z.boolean()]),
);

/** Preço ao vivo do configurador. Público: não precisa de sessão, não grava nada. */
export async function quoteAction(
  productId: string,
  locale: string,
  input: unknown,
): Promise<QuoteResult | null> {
  if (!z.uuid().safeParse(productId).success) return null;
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return null;
  try {
    return await quoteProduct(productId, parsed.data, locale);
  } catch (error) {
    log.error("shop.quote_failed", { productId, error });
    return null;
  }
}
