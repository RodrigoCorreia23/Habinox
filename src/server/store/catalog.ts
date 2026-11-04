/**
 * Leitura do catálogo para a loja: só categorias e produtos publicados.
 * O que vai para o browser (opções, valores, regras, textos) não inclui custos
 * nem margens; o preço calcula-se sempre aqui no servidor.
 */
import { and, asc, count, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, formulaVariables, products } from "@/db/schema";
import { type LocalizedText, localize } from "@/lib/localized";
import { vatCents as vatCentsOf } from "@/lib/money";
import { type ConfigError, type ProductOptionDef, resolveConfig, type Rule } from "@/lib/options";
import { calculatePrice } from "@/lib/pricing";
import { loadPricingModel } from "@/server/catalog/formula";
import { listVersionOptions } from "@/server/catalog/products";
import { getVatRate } from "@/server/settings";

export interface StoreCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parentId: string | null;
  productCount: number;
}

/** Categorias ativas com pelo menos um produto publicado (nelas ou nas subcategorias). */
export async function listStoreCategories(locale: string): Promise<StoreCategory[]> {
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
      parentId: categories.parentId,
    })
    .from(categories)
    .where(isNull(categories.archivedAt))
    .orderBy(asc(categories.position), asc(categories.createdAt));
  // Contagem numa consulta à parte: numa subconsulta sem join o drizzle não
  // qualifica as colunas e `categories.id` seria lido como o id de products.
  const counts = await db
    .select({ categoryId: products.categoryId, n: count() })
    .from(products)
    .where(and(isNull(products.archivedAt), isNotNull(products.publishedVersionId)))
    .groupBy(products.categoryId);
  const countOf = (id: string) => counts.find((row) => row.categoryId === id)?.n ?? 0;
  const total = (id: string) =>
    rows
      .filter((row) => row.parentId === id)
      .reduce((sum, child) => sum + countOf(child.id), countOf(id));

  return rows
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      name: localize(row.name, locale),
      description: row.description ? localize(row.description, locale) : null,
      parentId: row.parentId,
      productCount: row.parentId ? countOf(row.id) : total(row.id),
    }))
    .filter((row) => row.productCount > 0);
}

export async function getStoreCategory(slug: string, locale: string) {
  const all = await listStoreCategories(locale);
  const category = all.find((row) => row.slug === slug);
  if (!category) return null;
  const children = all.filter((row) => row.parentId === category.id);
  const ids = [category.id, ...children.map((child) => child.id)];
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      description: products.description,
      categoryId: products.categoryId,
    })
    .from(products)
    .where(
      and(
        inArray(products.categoryId, ids),
        isNull(products.archivedAt),
        isNotNull(products.publishedVersionId),
      ),
    )
    .orderBy(asc(sql`${products.name}->>'pt'`));
  const parent = category.parentId
    ? (all.find((row) => row.id === category.parentId) ?? null)
    : null;
  return {
    category,
    parent,
    children,
    products: rows.map((row) => ({
      ...row,
      name: localize(row.name, locale),
      description: row.description ? localize(row.description, locale) : null,
      categorySlug: all.find((cat) => cat.id === row.categoryId)?.slug ?? slug,
    })),
  };
}

export interface ConfiguratorOption {
  key: string;
  name: string;
  help: string | null;
  type: ProductOptionDef["type"];
  /** Unidade de apresentação das medidas (guardam-se sempre em mm). */
  unit: "mm" | "cm" | "m";
  min: number | null;
  max: number | null;
  step: number | null;
  required: boolean;
  display: string | null;
  values: { key: string; label: string; swatchHex: string | null; isDefault: boolean }[];
}

export interface ConfiguratorData {
  options: ConfiguratorOption[];
  /** Para correr as regras no browser (sem custos). */
  definitions: readonly ProductOptionDef[];
  rules: Rule[];
}

export async function getStoreProduct(categorySlug: string, productSlug: string, locale: string) {
  const [row] = await db
    .select({ product: products, category: categories })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(
      and(
        eq(products.slug, productSlug),
        eq(categories.slug, categorySlug),
        isNull(products.archivedAt),
        isNull(categories.archivedAt),
      ),
    );
  if (!row?.product.publishedVersionId) return null;
  const versionId = row.product.publishedVersionId;
  const model = await loadPricingModel(versionId);
  if (!model) return null;

  const versionOptions = await listVersionOptions(versionId);
  const options: ConfiguratorOption[] = versionOptions.map(
    ({ productOption, option, allowed, libraryValues }) => ({
      key: option.key,
      name: localize(option.name, locale),
      help: option.helpText ? localize(option.helpText, locale) : null,
      type: option.type as ProductOptionDef["type"],
      unit: (option.unit as "mm" | "cm" | "m" | null) ?? "mm",
      min: productOption.min,
      max: productOption.max,
      step: productOption.step,
      required: productOption.required,
      display: option.display,
      values: allowed.flatMap((entry) => {
        const value = libraryValues.find((candidate) => candidate.id === entry.optionValueId);
        return value
          ? [
              {
                key: value.key,
                label: localize(value.label, locale),
                swatchHex: value.swatchHex,
                isDefault: entry.isDefault,
              },
            ]
          : [];
      }),
    }),
  );

  return {
    product: {
      id: row.product.id,
      slug: row.product.slug,
      name: localize(row.product.name, locale),
      description: row.product.description ? localize(row.product.description, locale) : null,
    },
    category: { slug: row.category.slug, name: localize(row.category.name, locale) },
    configurator: {
      options,
      definitions: model.input.options,
      rules: model.rules,
    } satisfies ConfiguratorData,
  };
}

export type QuoteResult =
  | {
      ok: true;
      netCents: number;
      vatCents: number;
      totalCents: number;
      /** Variáveis marcadas "mostrar ao cliente" (ex.: 15 degraus). */
      facts: { label: string; value: number }[];
    }
  | { ok: false; errors: ConfigError[]; unavailable: boolean };

/** Preço de uma configuração do produto publicado. Recalcula sempre do zero. */
export async function quoteProduct(
  productId: string,
  input: Record<string, unknown>,
  locale: string,
): Promise<QuoteResult | null> {
  const [product] = await db
    .select({ versionId: products.publishedVersionId })
    .from(products)
    .where(and(eq(products.id, productId), isNull(products.archivedAt)));
  if (!product?.versionId) return null;
  const model = await loadPricingModel(product.versionId);
  if (!model) return null;

  const config = resolveConfig(model.input.options, model.rules, input);
  if (config.errors.length > 0) return { ok: false, errors: config.errors, unavailable: false };

  const result = calculatePrice({ ...model.input, values: config.values });
  if (!result.ok) {
    // Combinação sem artigo ou fórmula com problema: para o cliente é "não disponível".
    return {
      ok: false,
      errors: [{ code: "forbidden", message: "unavailable" }],
      unavailable: true,
    };
  }
  // IVA uma vez, ao total (o mesmo cálculo que vatCents da lib/money).
  const vatCents = vatCentsOf(result.netCents, await getVatRate());

  const visible = await db
    .select({ name: formulaVariables.name, label: formulaVariables.label })
    .from(formulaVariables)
    .where(
      and(
        eq(formulaVariables.productVersionId, product.versionId),
        eq(formulaVariables.showToCustomer, true),
      ),
    )
    .orderBy(asc(formulaVariables.position));
  const facts = visible.flatMap((variable) => {
    const value = result.variables[variable.name];
    return value === undefined
      ? []
      : [
          {
            label: localize(variable.label ?? ({ pt: variable.name } as LocalizedText), locale),
            value,
          },
        ];
  });

  return {
    ok: true,
    netCents: result.netCents,
    vatCents,
    totalCents: result.netCents + vatCents,
    facts,
  };
}
