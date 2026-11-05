"use server";

import { z } from "zod";
import { log } from "@/lib/log";
import { allowRequest } from "@/server/rate-limit";
import { type QuoteResult, quoteProduct } from "@/server/store/catalog";

const inputSchema = z.record(
  z.string().regex(/^[a-z][a-z0-9_]*$/),
  z.union([z.string().max(80), z.number().finite(), z.boolean()]),
);

/**
 * Preço ao vivo do configurador. Público: não precisa de sessão, não grava nada.
 * Limitado por IP (senão servia para tirar a tabela de preços toda).
 */
export async function quoteAction(
  productId: string,
  locale: string,
  input: unknown,
): Promise<QuoteResult | "rate_limited" | null> {
  if (!z.uuid().safeParse(productId).success) return null;
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return null;
  if (!(await allowRequest("quote"))) return "rate_limited";
  try {
    return await quoteProduct(productId, parsed.data, locale);
  } catch (error) {
    log.error("shop.quote_failed", { productId, error });
    return null;
  }
}
