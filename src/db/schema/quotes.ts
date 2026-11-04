/**
 * Orçamentos guardados e carrinho.
 * Um orçamento fixa o preço de uma configuração durante um prazo (settings
 * `quote_validity_days`) e guarda o snapshot completo (versão do produto,
 * escolhas, decomposição com custos e margens, IVA): serve de auditoria e é
 * a base da linha da encomenda. O snapshot nunca vai para o browser.
 */
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { products, productVersions } from "./catalog";

export const quotes = pgTable(
  "quotes",
  {
    id: uuid().defaultRandom().primaryKey(),
    productId: uuid()
      .notNull()
      .references(() => products.id),
    productVersionId: uuid()
      .notNull()
      .references(() => productVersions.id),
    userId: uuid().references(() => user.id, { onDelete: "set null" }),
    /** Escolhas do cliente (chaves de opção → valor; medidas em mm). */
    config: jsonb().$type<Record<string, number | string | boolean>>().notNull(),
    netCents: integer().notNull(),
    vatRate: numeric({ precision: 5, scale: 4 }).notNull(),
    vatCents: integer().notNull(),
    totalCents: integer().notNull(),
    snapshot: jsonb().notNull(),
    validUntil: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "quotes_amounts",
      sql`${table.netCents} >= 0 and ${table.vatCents} >= 0 and ${table.totalCents} = ${table.netCents} + ${table.vatCents}`,
    ),
    index("quotes_user_idx").on(table.userId),
  ],
);

/** Carrinho de um visitante: identificado por um cookie; guarda-se só o hash. */
export const carts = pgTable("carts", {
  id: uuid().defaultRandom().primaryKey(),
  tokenHash: text().notNull().unique(),
  userId: uuid().references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid().defaultRandom().primaryKey(),
    cartId: uuid()
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    quoteId: uuid()
      .notNull()
      .references(() => quotes.id),
    quantity: integer().notNull().default(1),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("cart_items_quantity", sql`${table.quantity} between 1 and 99`),
    index("cart_items_cart_idx").on(table.cartId),
  ],
);
