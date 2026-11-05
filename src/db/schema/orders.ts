/**
 * Encomendas. Cada linha copia o orçamento usado (preço e snapshot), para a
 * encomenda nunca depender de dados que mudem depois. As mudanças de estado
 * passam por lib/orders/state e ficam registadas em order_events.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { Address } from "@/lib/address";
import { user } from "./auth";
import { products, productVersions } from "./catalog";
import { quotes } from "./quotes";

/** Numeração legível das encomendas (HBX-2026-00001). */
export const orderNumberSeq = pgSequence("order_number_seq", { startWith: 1 });

export const orders = pgTable(
  "orders",
  {
    id: uuid().defaultRandom().primaryKey(),
    number: text().notNull().unique(),
    userId: uuid()
      .notNull()
      .references(() => user.id),
    status: text().notNull().default("pending_payment"),
    netCents: integer().notNull(),
    vatRate: numeric({ precision: 5, scale: 4 }).notNull(),
    vatCents: integer().notNull(),
    totalCents: integer().notNull(),
    email: text().notNull(),
    phone: text().notNull(),
    nif: text(),
    billingAddress: jsonb().$type<Address>().notNull(),
    shippingAddress: jsonb().$type<Address>().notNull(),
    notes: text(),
    /** Língua em que o cliente encomendou: os emails da encomenda saem nela. */
    locale: text().notNull().default("pt"),
    /** O cliente assumiu a responsabilidade pelas medidas (obrigatório, com data). */
    measuresAcceptedAt: timestamp({ withTimezone: true }).notNull(),
    termsAcceptedAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "orders_status",
      sql`${table.status} in ('pending_payment', 'paid', 'in_production', 'ready', 'shipped', 'delivered', 'cancelled', 'expired')`,
    ),
    check(
      "orders_amounts",
      sql`${table.netCents} >= 0 and ${table.totalCents} = ${table.netCents} + ${table.vatCents}`,
    ),
    index("orders_user_idx").on(table.userId),
    index("orders_status_idx").on(table.status, table.createdAt),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid().defaultRandom().primaryKey(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    productId: uuid()
      .notNull()
      .references(() => products.id),
    productVersionId: uuid()
      .notNull()
      .references(() => productVersions.id),
    quoteId: uuid()
      .notNull()
      .references(() => quotes.id),
    config: jsonb().$type<Record<string, number | string | boolean>>().notNull(),
    quantity: integer().notNull(),
    unitNetCents: integer().notNull(),
    snapshot: jsonb().notNull(),
  },
  (table) => [
    check("order_items_quantity", sql`${table.quantity} between 1 and 99`),
    index("order_items_order_idx").on(table.orderId),
  ],
);

/** Histórico de estados (auditoria): quem mudou, de quê para quê, e porquê. */
export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid().defaultRandom().primaryKey(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: text(),
    toStatus: text().notNull(),
    actorUserId: uuid().references(() => user.id, { onDelete: "set null" }),
    note: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("order_events_order_idx").on(table.orderId, table.createdAt)],
);

/** Consentimentos (RGPD): o quê, sim/não, de onde, quando. Nunca se alteram; acrescentam-se. */
export const consents = pgTable(
  "consents",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text().notNull(),
    granted: boolean().notNull(),
    source: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("consents_user_idx").on(table.userId, table.type)],
);
