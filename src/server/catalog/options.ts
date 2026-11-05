import { and, asc, count, eq, inArray, isNotNull, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import {
  materials,
  optionDefinitions,
  optionValues,
  productOptions,
  productOptionValues,
  products,
  productVersions,
} from "@/db/schema";
import type { LocalizedText } from "@/lib/localized";
import { KEY_PATTERN, type OptionType, valueFromArticle } from "@/lib/options";

export type OptionRow = typeof optionDefinitions.$inferSelect;
export type OptionValueRow = typeof optionValues.$inferSelect;

export const OPTION_TYPES: Record<OptionType, string> = {
  dimension: "Medida",
  number: "Número",
  choice: "Escolha",
  boolean: "Sim / não",
};

export async function listOptions({ archived = false } = {}) {
  // Contagem à parte (ver listStoreCategories: subconsultas sem join ficam sem tabela).
  const [rows, counts] = await Promise.all([
    db
      .select({
        id: optionDefinitions.id,
        key: optionDefinitions.key,
        name: optionDefinitions.name,
        type: optionDefinitions.type,
        archivedAt: optionDefinitions.archivedAt,
      })
      .from(optionDefinitions)
      .where(
        archived ? isNotNull(optionDefinitions.archivedAt) : isNull(optionDefinitions.archivedAt),
      )
      .orderBy(asc(optionDefinitions.key)),
    db
      .select({ optionId: optionValues.optionId, n: count() })
      .from(optionValues)
      .where(isNull(optionValues.archivedAt))
      .groupBy(optionValues.optionId),
  ]);
  return rows.map((row) => ({
    ...row,
    values: counts.find((entry) => entry.optionId === row.id)?.n ?? 0,
  }));
}

// ── Onde se usa ─────────────────────────────────────────────────────────────

export type ProductRef = { id: string; name: string };

/**
 * As versões que contam para «usada em»: de cada produto não arquivado, a versão
 * publicada (a da loja) e a mais recente (a que se está a preparar).
 */
export async function listCurrentVersions() {
  const rows = await db
    .select({
      productId: products.id,
      name: products.name,
      publishedVersionId: products.publishedVersionId,
      versionId: productVersions.id,
      version: productVersions.version,
    })
    .from(productVersions)
    .innerJoin(products, eq(products.id, productVersions.productId))
    .where(isNull(products.archivedAt));
  const latest = new Map<string, number>();
  for (const row of rows) {
    latest.set(row.productId, Math.max(latest.get(row.productId) ?? 0, row.version));
  }
  const versions = new Map<string, ProductRef>();
  for (const row of rows) {
    if (row.versionId === row.publishedVersionId || row.version === latest.get(row.productId)) {
      versions.set(row.versionId, { id: row.productId, name: row.name.pt });
    }
  }
  return versions;
}

function addProduct(map: Map<string, ProductRef[]>, key: string, product: ProductRef) {
  const list = map.get(key) ?? [];
  if (!list.some((entry) => entry.id === product.id)) list.push(product);
  map.set(key, list);
}

/** Produtos que usam cada opção (id da opção → produtos, sem repetir). */
export async function listOptionUsage(): Promise<Map<string, ProductRef[]>> {
  const versions = await listCurrentVersions();
  const usage = new Map<string, ProductRef[]>();
  if (versions.size === 0) return usage;
  const rows = await db
    .select({ optionId: productOptions.optionId, versionId: productOptions.productVersionId })
    .from(productOptions)
    .where(inArray(productOptions.productVersionId, [...versions.keys()]));
  for (const row of rows) addProduct(usage, row.optionId, versions.get(row.versionId)!);
  for (const list of usage.values()) list.sort((a, b) => a.name.localeCompare(b.name, "pt"));
  return usage;
}

/** Produtos que oferecem cada valor de uma opção (id do valor → produtos). */
export async function listValueUsage(optionId: string): Promise<Map<string, ProductRef[]>> {
  const versions = await listCurrentVersions();
  const usage = new Map<string, ProductRef[]>();
  if (versions.size === 0) return usage;
  const rows = await db
    .select({
      valueId: productOptionValues.optionValueId,
      versionId: productOptions.productVersionId,
    })
    .from(productOptionValues)
    .innerJoin(productOptions, eq(productOptions.id, productOptionValues.productOptionId))
    .where(
      and(
        eq(productOptions.optionId, optionId),
        inArray(productOptions.productVersionId, [...versions.keys()]),
      ),
    );
  for (const row of rows) addProduct(usage, row.valueId, versions.get(row.versionId)!);
  return usage;
}

/**
 * Para a lista de opções: o resumo dos valores ativos («3: Ferro lacado, Inox…»),
 * a unidade das medidas e os produtos que usam cada opção.
 */
export async function listOptionSummaries({ archived = false } = {}) {
  const [rows, values, usage] = await Promise.all([
    db
      .select()
      .from(optionDefinitions)
      .where(
        archived ? isNotNull(optionDefinitions.archivedAt) : isNull(optionDefinitions.archivedAt),
      )
      .orderBy(asc(optionDefinitions.key)),
    db
      .select({ optionId: optionValues.optionId, label: optionValues.label })
      .from(optionValues)
      .where(isNull(optionValues.archivedAt))
      .orderBy(asc(optionValues.position), asc(optionValues.key)),
    listOptionUsage(),
  ]);
  return rows.map((row) => ({
    id: row.id,
    name: row.name.pt,
    type: row.type as OptionType,
    unit: row.unit,
    values: values.filter((value) => value.optionId === row.id).map((value) => value.label.pt),
    usedIn: usage.get(row.id) ?? [],
  }));
}

export async function getOption(id: string) {
  const [option] = await db.select().from(optionDefinitions).where(eq(optionDefinitions.id, id));
  if (!option) return null;
  const values = await db
    .select({
      value: optionValues,
      material: { id: materials.id, name: materials.name, erpCode: materials.erpCode },
    })
    .from(optionValues)
    .leftJoin(materials, eq(materials.id, optionValues.materialId))
    .where(eq(optionValues.optionId, id))
    .orderBy(asc(optionValues.position), asc(optionValues.key));
  return { option, values };
}

const key = z
  .string()
  .regex(KEY_PATTERN, "Só minúsculas, números e _ (a começar por letra)")
  .max(40);
const text = (max: number) => z.string().trim().max(max);

export const optionInputSchema = z
  .object({
    name: text(80).min(1, "Escreva o nome"),
    key,
    type: z.enum(["dimension", "number", "choice", "boolean"]),
    unit: z.enum(["mm", "cm", "m"]).nullable(),
    display: z.enum(["pills", "list", "swatches"]).nullable(),
    helpText: text(500),
  })
  .transform((input) => ({
    ...input,
    // A unidade só faz sentido nas medidas; a apresentação só nas escolhas.
    unit: input.type === "dimension" ? (input.unit ?? "mm") : null,
    display: input.type === "choice" ? (input.display ?? "pills") : null,
  }));

export type OptionInput = z.output<typeof optionInputSchema>;

export type Result<F extends string = string> =
  { ok: true; id: string } | { ok: false; field?: F; message: string };

const localized = (pt: string): LocalizedText => ({ pt });

export async function createOption(input: OptionInput): Promise<Result<keyof OptionInput>> {
  const [taken] = await db
    .select({ id: optionDefinitions.id })
    .from(optionDefinitions)
    .where(eq(optionDefinitions.key, input.key));
  if (taken) {
    return {
      ok: false,
      field: "key",
      message:
        "Já existe uma opção com este nome nas fórmulas. Escreva outro aqui (ex.: largura_portao).",
    };
  }
  const [created] = await db
    .insert(optionDefinitions)
    .values({
      key: input.key,
      name: localized(input.name),
      type: input.type,
      unit: input.unit,
      display: input.display,
      helpText: input.helpText ? localized(input.helpText) : null,
    })
    .returning({ id: optionDefinitions.id });
  return { ok: true, id: created!.id };
}

/** A chave e o tipo não mudam depois de criados (orçamentos e fórmulas dependem deles). */
export async function updateOption(
  id: string,
  input: Pick<OptionInput, "name" | "unit" | "display" | "helpText">,
): Promise<Result> {
  const existing = await getOption(id);
  if (!existing) return { ok: false, message: "Opção não encontrada" };
  const { option } = existing;
  await db
    .update(optionDefinitions)
    .set({
      name: { ...option.name, pt: input.name },
      unit: option.type === "dimension" ? input.unit : null,
      display: option.type === "choice" ? input.display : null,
      helpText: input.helpText ? { ...(option.helpText ?? {}), pt: input.helpText } : null,
    })
    .where(eq(optionDefinitions.id, id));
  return { ok: true, id };
}

/**
 * Arquivar uma opção não muda os produtos que já a usam (guardam a sua própria
 * configuração): só deixa de se poder acrescentar a produtos. Devolve esses
 * produtos para a mensagem dizer o efeito.
 */
export async function setOptionArchived(
  id: string,
  archived: boolean,
): Promise<{ ok: boolean; usedIn: ProductRef[] }> {
  const updated = await db
    .update(optionDefinitions)
    .set({ archivedAt: archived ? new Date() : null })
    .where(eq(optionDefinitions.id, id))
    .returning({ id: optionDefinitions.id });
  if (updated.length === 0) return { ok: false, usedIn: [] };
  const usage = await listOptionUsage();
  return { ok: true, usedIn: usage.get(id) ?? [] };
}

export const valueInputSchema = z.object({
  label: text(80).min(1, "Escreva o nome do valor"),
  key,
  position: z.coerce.number().int().min(0).max(9999),
  params: z.record(z.string().regex(KEY_PATTERN), z.number().finite()),
  ralCode: text(20),
  swatchHex: z.union([z.literal(""), z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor em #RRGGBB")]),
  materialId: z.uuid().nullable(),
  asksText: z.boolean(),
});

export type ValueInput = z.infer<typeof valueInputSchema>;

async function checkValue(
  optionId: string,
  input: ValueInput,
  exceptId: string | null,
): Promise<Result<keyof ValueInput> | null> {
  const [option] = await db
    .select({ type: optionDefinitions.type })
    .from(optionDefinitions)
    .where(eq(optionDefinitions.id, optionId));
  if (!option) return { ok: false, message: "Opção não encontrada" };
  if (option.type !== "choice")
    return { ok: false, message: "Só as opções de escolha têm valores" };

  const [taken] = await db
    .select({ n: count() })
    .from(optionValues)
    .where(
      and(
        eq(optionValues.optionId, optionId),
        eq(optionValues.key, input.key),
        exceptId ? ne(optionValues.id, exceptId) : undefined,
      ),
    );
  if ((taken?.n ?? 0) > 0) {
    return { ok: false, field: "key", message: "Já existe um valor com este nome nesta opção" };
  }
  if (input.materialId) {
    const [material] = await db
      .select({ id: materials.id })
      .from(materials)
      .where(eq(materials.id, input.materialId));
    if (!material) {
      return { ok: false, field: "materialId", message: "Esse material já não existe no ERP" };
    }
  }
  return null;
}

function valueColumns(input: ValueInput) {
  return {
    position: input.position,
    params: input.params,
    ralCode: input.ralCode || null,
    swatchHex: input.swatchHex ? input.swatchHex.toUpperCase() : null,
    materialId: input.materialId,
    asksText: input.asksText,
  };
}

export async function createValue(
  optionId: string,
  input: ValueInput,
): Promise<Result<keyof ValueInput>> {
  const error = await checkValue(optionId, input, null);
  if (error) return error;
  const [created] = await db
    .insert(optionValues)
    .values({ optionId, key: input.key, label: localized(input.label), ...valueColumns(input) })
    .returning({ id: optionValues.id });
  return { ok: true, id: created!.id };
}

/** A chave do valor não muda (orçamentos guardam-na). */
export async function updateValue(
  id: string,
  input: Omit<ValueInput, "key">,
): Promise<Result<keyof ValueInput>> {
  const [existing] = await db.select().from(optionValues).where(eq(optionValues.id, id));
  if (!existing) return { ok: false, message: "Valor não encontrado" };
  const error = await checkValue(existing.optionId, { ...input, key: existing.key }, id);
  if (error) return error;
  await db
    .update(optionValues)
    .set({
      label: { ...existing.label, pt: input.label },
      ...valueColumns({ ...input, key: existing.key }),
    })
    .where(eq(optionValues.id, id));
  return { ok: true, id };
}

/**
 * Como nas opções: os produtos que já oferecem o valor continuam iguais; só deixa
 * de vir na lista quando se acrescenta a opção a um produto. Devolve a opção do
 * valor (null se não existir) e os produtos que o oferecem.
 */
export async function setValueArchived(
  id: string,
  archived: boolean,
): Promise<{ optionId: string | null; usedIn: ProductRef[] }> {
  const [updated] = await db
    .update(optionValues)
    .set({ archivedAt: archived ? new Date() : null })
    .where(eq(optionValues.id, id))
    .returning({ optionId: optionValues.optionId });
  if (!updated) return { optionId: null, usedIn: [] };
  const usage = await listValueUsage(updated.optionId);
  return { optionId: updated.optionId, usedIn: usage.get(id) ?? [] };
}

/**
 * Sobe ou desce um valor entre os valores ativos da mesma opção. Regrava as
 * posições 0, 1, 2… pela ordem mostrada, por isso também arruma posições repetidas.
 */
export async function moveValue(
  id: string,
  direction: "up" | "down",
): Promise<{ ok: boolean; optionId: string | null }> {
  return db.transaction(async (tx) => {
    const [value] = await tx.select().from(optionValues).where(eq(optionValues.id, id));
    if (!value || value.archivedAt) return { ok: false, optionId: null };
    const siblings = await tx
      .select({ id: optionValues.id })
      .from(optionValues)
      .where(and(eq(optionValues.optionId, value.optionId), isNull(optionValues.archivedAt)))
      .orderBy(asc(optionValues.position), asc(optionValues.key));
    const order = siblings.map((row) => row.id);
    const from = order.indexOf(id);
    const to = direction === "up" ? from - 1 : from + 1;
    if (from < 0 || to < 0 || to >= order.length) return { ok: true, optionId: value.optionId };
    [order[from], order[to]] = [order[to]!, order[from]!];
    for (const [position, valueId] of order.entries()) {
      await tx.update(optionValues).set({ position }).where(eq(optionValues.id, valueId));
    }
    return { ok: true, optionId: value.optionId };
  });
}

/** Artigos do ERP para escolher num valor (ex.: o motor que o valor acrescenta). */
export async function listArticlesForPicker() {
  return db
    .select({
      id: materials.id,
      name: materials.name,
      erpCode: materials.erpCode,
      unit: materials.unit,
      cost: materials.cost,
    })
    .from(materials)
    .orderBy(asc(materials.name));
}

/** Todas as opções ativas, com os valores ativos, para o editor das regras da biblioteca. */
export async function listLibraryOptionInfo() {
  const options = await db
    .select()
    .from(optionDefinitions)
    .where(isNull(optionDefinitions.archivedAt))
    .orderBy(asc(optionDefinitions.key));
  const values = await db
    .select()
    .from(optionValues)
    .where(isNull(optionValues.archivedAt))
    .orderBy(asc(optionValues.position));
  return options.map((option) => ({
    key: option.key,
    name: option.name.pt,
    type: option.type as OptionType,
    unit: option.unit,
    values: values
      .filter((value) => value.optionId === option.id)
      .map((value) => ({ key: value.key, label: value.label.pt })),
  }));
}

/** Famílias de artigos do ERP com os seus artigos (para «Importar do Odoo»). */
export async function listErpFamilies() {
  const rows = await db
    .select({
      id: materials.id,
      name: materials.name,
      erpCode: materials.erpCode,
      family: materials.erpFamily,
      unit: materials.unit,
      cost: materials.cost,
      margin: materials.margin,
    })
    .from(materials)
    .where(isNull(materials.erpMissingAt))
    .orderBy(asc(materials.erpFamily), asc(materials.name));
  const families = new Map<string, typeof rows>();
  for (const row of rows) {
    const family = row.family ?? "Sem família";
    families.set(family, [...(families.get(family) ?? []), row]);
  }
  return [...families].map(([name, articles]) => ({ name, articles }));
}

export interface ImportSummary {
  created: string[];
  skipped: { name: string; reason: string }[];
}

/**
 * Cria valores de uma opção a partir de artigos do ERP (ex.: cores RAL).
 * Com `link`, o valor fica ligado ao artigo e o custo dele entra no preço;
 * sem `link`, traz só o nome e o código. Valores que já existem (mesma chave
 * ou mesmo artigo) saltam-se.
 */
export async function importValuesFromErp(
  optionId: string,
  materialIds: string[],
  link: boolean,
): Promise<ImportSummary | { error: string }> {
  return db.transaction(async (tx) => {
    const [option] = await tx
      .select({ type: optionDefinitions.type })
      .from(optionDefinitions)
      .where(eq(optionDefinitions.id, optionId));
    if (!option) return { error: "Opção não encontrada" };
    if (option.type !== "choice") return { error: "Só as opções de escolha têm valores" };

    const articles = materialIds.length
      ? await tx.select().from(materials).where(inArray(materials.id, materialIds))
      : [];
    const existing = await tx
      .select({
        key: optionValues.key,
        materialId: optionValues.materialId,
        position: optionValues.position,
      })
      .from(optionValues)
      .where(eq(optionValues.optionId, optionId));
    const keys = new Set(existing.map((value) => value.key));
    const linked = new Set(existing.map((value) => value.materialId).filter(Boolean));
    let position = Math.max(-1, ...existing.map((value) => value.position)) + 1;

    const summary: ImportSummary = { created: [], skipped: [] };
    for (const article of articles.sort((a, b) => a.name.localeCompare(b.name, "pt"))) {
      const value = valueFromArticle(article.name);
      if (keys.has(value.key) || linked.has(article.id)) {
        summary.skipped.push({ name: article.name, reason: "já existe nesta opção" });
        continue;
      }
      await tx.insert(optionValues).values({
        optionId,
        key: value.key,
        label: localized(value.label),
        position: position++,
        params: {},
        ralCode: value.ralCode || null,
        materialId: link ? article.id : null,
        asksText: false,
      });
      keys.add(value.key);
      summary.created.push(value.label);
    }
    return summary;
  });
}
