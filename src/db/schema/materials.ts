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

/**
 * Cópia local dos artigos do ERP (Odoo). A loja lê sempre daqui, nunca do ERP
 * em tempo de pedido. A sincronização atualiza nome, unidade, custo e peso;
 * a margem é da loja e a sincronização nunca lhe toca.
 */
export const materials = pgTable(
  "materials",
  {
    id: uuid().defaultRandom().primaryKey(),
    /** Referência interna no ERP: a ligação entre os dois sistemas. */
    erpCode: text().notNull().unique(),
    name: text().notNull(),
    /** Família/categoria do artigo no ERP (ex.: "Cores RAL"); para importar valores de opções. */
    erpFamily: text(),
    /** Unidade em que entra no fabrico (m, m², un., kg). */
    unit: text().notNull(),
    cost: numeric({ precision: 12, scale: 4 }).notNull(),
    /** kg por unidade; para o transporte. */
    weightPerUnit: numeric({ precision: 12, scale: 4 }),
    /** Fração (0.0500 = 5%); null = por decidir, bloqueia a publicação. */
    margin: numeric({ precision: 5, scale: 4 }),
    costUpdatedAt: timestamp({ withTimezone: true }).notNull(),
    /** Desapareceu do ERP: mantém o último custo e fica para revisão humana. */
    erpMissingAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("materials_cost_not_negative", sql`${table.cost} >= 0`),
    check("materials_margin_not_negative", sql`${table.margin} >= 0`),
  ],
);

/** Histórico de custos, para auditoria de preços e relatórios. */
export const materialCosts = pgTable(
  "material_costs",
  {
    id: uuid().defaultRandom().primaryKey(),
    materialId: uuid()
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),
    cost: numeric({ precision: 12, scale: 4 }).notNull(),
    observedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("material_costs_material_idx").on(table.materialId, table.observedAt)],
);

export const syncRuns = pgTable(
  "sync_runs",
  {
    id: uuid().defaultRandom().primaryKey(),
    source: text().notNull(),
    startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp({ withTimezone: true }),
    status: text().notNull().default("running"),
    items: integer().notNull().default(0),
    errors: jsonb().$type<unknown[]>().notNull().default([]),
  },
  (table) => [
    check(
      "sync_runs_status",
      sql`${table.status} in ('running', 'succeeded', 'partial', 'failed')`,
    ),
    index("sync_runs_source_idx").on(table.source, table.startedAt),
  ],
);
