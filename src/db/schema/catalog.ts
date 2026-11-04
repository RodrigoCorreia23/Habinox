/**
 * Catálogo, biblioteca de opções e fórmulas (desenho em docs/modelo-opcoes.md).
 *
 * - A biblioteca (opções, valores, sectores, regras gerais) não tem
 *   versões: mudar vale logo para todos os produtos.
 * - Tudo o que é de um produto (opções usadas, limites, regras, variáveis,
 *   linhas) pertence a uma versão: rascunho → validada → publicada.
 * - Nada se apaga do que um orçamento possa referir: arquiva-se (`archivedAt`).
 * - Textos que o cliente vê: `jsonb` por língua (LocalizedText).
 */
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type { LocalizedText } from "@/lib/localized";
import type { Condition, RuleEffect } from "@/lib/options";
import { user } from "./auth";
import { materials } from "./materials";

const archivedAt = () => timestamp({ withTimezone: true });
const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();
const margin = () => numeric({ precision: 5, scale: 4 });

// ── Biblioteca ──────────────────────────────────────────────────────────────

/** Sectores de mão de obra (serralharia, corte laser, instalação…). */
export const sectors = pgTable(
  "sectors",
  {
    id: uuid().defaultRandom().primaryKey(),
    name: text().notNull(),
    hourlyRateCents: integer().notNull(),
    margin: margin(),
    archivedAt: archivedAt(),
    createdAt: createdAt(),
  },
  (table) => [
    check("sectors_rate_not_negative", sql`${table.hourlyRateCents} >= 0`),
    check("sectors_margin_not_negative", sql`${table.margin} >= 0`),
  ],
);

export const optionDefinitions = pgTable(
  "option_definitions",
  {
    id: uuid().defaultRandom().primaryKey(),
    /** Chave técnica; não muda depois de usada num orçamento. */
    key: text().notNull().unique(),
    name: jsonb().$type<LocalizedText>().notNull(),
    type: text().notNull(),
    /** Unidade de apresentação das medidas (mm, cm, m). */
    unit: text(),
    display: text(),
    helpText: jsonb().$type<LocalizedText>(),
    archivedAt: archivedAt(),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      "option_definitions_type",
      sql`${table.type} in ('dimension', 'number', 'choice', 'boolean')`,
    ),
    check("option_definitions_display", sql`${table.display} in ('pills', 'list', 'swatches')`),
    check("option_definitions_key", sql`${table.key} ~ '^[a-z][a-z0-9_]*$'`),
  ],
);

export const optionValues = pgTable(
  "option_values",
  {
    id: uuid().defaultRandom().primaryKey(),
    optionId: uuid()
      .notNull()
      .references(() => optionDefinitions.id),
    key: text().notNull(),
    label: jsonb().$type<LocalizedText>().notNull(),
    position: integer().notNull().default(0),
    /** Números com nome usados nas expressões (`espacamento.valor`). */
    params: jsonb().$type<Record<string, number>>().notNull().default({}),
    ralCode: text(),
    swatchHex: text(),
    /**
     * Artigo comprado que este valor acrescenta, quantidade 1 (ex.: "Motor e 2
     * comandos" → kit do motor). Vem do ERP como os materiais, com a margem da loja.
     */
    materialId: uuid().references(() => materials.id),
    /** Pede texto ao cliente (ex.: "Outra cor RAL → qual?"). */
    asksText: boolean().notNull().default(false),
    archivedAt: archivedAt(),
  },
  (table) => [
    unique("option_values_option_key").on(table.optionId, table.key),
    check("option_values_key", sql`${table.key} ~ '^[a-z][a-z0-9_]*$'`),
  ],
);

// ── Catálogo ────────────────────────────────────────────────────────────────

/** Árvore de categorias: categoria → subcategoria (ex.: Portões → Portões de correr). */
export const categories = pgTable(
  "categories",
  {
    id: uuid().defaultRandom().primaryKey(),
    parentId: uuid().references((): AnyPgColumn => categories.id),
    slug: text().notNull().unique(),
    name: jsonb().$type<LocalizedText>().notNull(),
    description: jsonb().$type<LocalizedText>(),
    imageUrl: text(),
    position: integer().notNull().default(0),
    archivedAt: archivedAt(),
    createdAt: createdAt(),
  },
  (table) => [index("categories_parent_idx").on(table.parentId)],
);

export const products = pgTable(
  "products",
  {
    id: uuid().defaultRandom().primaryKey(),
    categoryId: uuid()
      .notNull()
      .references(() => categories.id),
    slug: text().notNull().unique(),
    name: jsonb().$type<LocalizedText>().notNull(),
    description: jsonb().$type<LocalizedText>(),
    modelGlbUrl: text(),
    /** A versão que a loja mostra; null = ainda não publicado. */
    publishedVersionId: uuid().references((): AnyPgColumn => productVersions.id),
    archivedAt: archivedAt(),
    createdAt: createdAt(),
  },
  (table) => [index("products_category_idx").on(table.categoryId)],
);

export const productVersions = pgTable(
  "product_versions",
  {
    id: uuid().defaultRandom().primaryKey(),
    productId: uuid()
      .notNull()
      .references(() => products.id),
    version: integer().notNull(),
    status: text().notNull().default("draft"),
    /** Consumíveis em fração dos materiais (0.1000 = 10%). */
    consumablesRate: numeric({ precision: 5, scale: 4 }).notNull().default("0"),
    createdBy: uuid().references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    validatedAt: timestamp({ withTimezone: true }),
    publishedAt: timestamp({ withTimezone: true }),
  },
  (table) => [
    unique("product_versions_product_version").on(table.productId, table.version),
    check("product_versions_status", sql`${table.status} in ('draft', 'validated', 'published')`),
    check("product_versions_consumables", sql`${table.consumablesRate} >= 0`),
  ],
);

/** Uma opção da biblioteca tal como esta versão do produto a usa. */
export const productOptions = pgTable(
  "product_options",
  {
    id: uuid().defaultRandom().primaryKey(),
    productVersionId: uuid()
      .notNull()
      .references(() => productVersions.id, { onDelete: "cascade" }),
    optionId: uuid()
      .notNull()
      .references(() => optionDefinitions.id),
    position: integer().notNull(),
    /** Nome na fórmula (L, H…); null = a chave da opção. */
    var: text(),
    required: boolean().notNull().default(true),
    /** Medidas em mm inteiros. */
    min: integer(),
    max: integer(),
    step: integer(),
    defaultValue: jsonb().$type<number | string | boolean>(),
  },
  (table) => [
    unique("product_options_version_option").on(table.productVersionId, table.optionId),
    unique("product_options_version_var").on(table.productVersionId, table.var),
    check(
      "product_options_range",
      sql`${table.min} is null or ${table.max} is null or ${table.min} <= ${table.max}`,
    ),
    check("product_options_step", sql`${table.step} is null or ${table.step} > 0`),
  ],
);

/** Valores permitidos de uma opção de escolha, neste produto. */
export const productOptionValues = pgTable(
  "product_option_values",
  {
    productOptionId: uuid()
      .notNull()
      .references(() => productOptions.id, { onDelete: "cascade" }),
    optionValueId: uuid()
      .notNull()
      .references(() => optionValues.id),
    position: integer().notNull().default(0),
    isDefault: boolean().notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.productOptionId, table.optionValueId] })],
);

/** Regras "se… então…"; sem versão de produto = regra da biblioteca. */
export const optionRules = pgTable(
  "option_rules",
  {
    id: uuid().defaultRandom().primaryKey(),
    productVersionId: uuid().references(() => productVersions.id, { onDelete: "cascade" }),
    position: integer().notNull().default(0),
    conditions: jsonb().$type<Condition[]>().notNull(),
    effect: jsonb().$type<RuleEffect>().notNull(),
    message: jsonb().$type<LocalizedText>(),
  },
  (table) => [index("option_rules_version_idx").on(table.productVersionId)],
);

// ── Fórmula ─────────────────────────────────────────────────────────────────

export const formulaVariables = pgTable(
  "formula_variables",
  {
    id: uuid().defaultRandom().primaryKey(),
    productVersionId: uuid()
      .notNull()
      .references(() => productVersions.id, { onDelete: "cascade" }),
    name: text().notNull(),
    expr: text().notNull(),
    position: integer().notNull(),
    label: jsonb().$type<LocalizedText>(),
    showToCustomer: boolean().notNull().default(false),
  },
  (table) => [unique("formula_variables_version_name").on(table.productVersionId, table.name)],
);

export const formulaLines = pgTable(
  "formula_lines",
  {
    id: uuid().defaultRandom().primaryKey(),
    productVersionId: uuid()
      .notNull()
      .references(() => productVersions.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    label: text().notNull(),
    kind: text().notNull(),
    quantityExpr: text().notNull(),
    unit: text().notNull(),
    conditions: jsonb().$type<Condition[]>().notNull().default([]),
    /** Artigo fixo… */
    materialId: uuid().references(() => materials.id),
    /** …ou escolhido pelo valor desta opção (ver formula_line_materials). */
    articleOptionId: uuid().references(() => optionDefinitions.id),
    sectorId: uuid().references(() => sectors.id),
  },
  (table) => [
    check(
      "formula_lines_kind",
      sql`${table.kind} in ('material', 'labour', 'external', 'component')`,
    ),
    // Mão de obra aponta para um sector; o resto (materiais, serviços externos e
    // componentes, todos artigos do ERP) para um artigo fixo ou escolhido por opção.
    check(
      "formula_lines_source",
      sql`case ${table.kind}
        when 'labour' then ${table.sectorId} is not null and ${table.materialId} is null and ${table.articleOptionId} is null
        else ${table.sectorId} is null and ((${table.materialId} is null) <> (${table.articleOptionId} is null))
      end`,
    ),
    index("formula_lines_version_idx").on(table.productVersionId),
  ],
);

/** Artigo da linha conforme o valor escolhido (ferro → TF4040, inox → TI4040). */
export const formulaLineMaterials = pgTable(
  "formula_line_materials",
  {
    formulaLineId: uuid()
      .notNull()
      .references(() => formulaLines.id, { onDelete: "cascade" }),
    optionValueId: uuid()
      .notNull()
      .references(() => optionValues.id),
    materialId: uuid()
      .notNull()
      .references(() => materials.id),
  },
  (table) => [primaryKey({ columns: [table.formulaLineId, table.optionValueId] })],
);
