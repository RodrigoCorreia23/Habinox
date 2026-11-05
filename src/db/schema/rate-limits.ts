/**
 * Limite de pedidos nas ações públicas (orçamento, carrinho, encomenda).
 * Janela fixa por chave `ação:cliente`; o cliente é o IP (em HMAC, nunca em
 * claro) ou o id do utilizador. Na Vercel cada pedido pode correr noutra
 * instância, por isso a contagem fica na BD e não em memória.
 */
import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text().primaryKey(),
    windowStart: timestamp({ withTimezone: true }).notNull().defaultNow(),
    count: integer().notNull().default(1),
  },
  (table) => [index().on(table.windowStart)],
);
