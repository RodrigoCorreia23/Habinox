import { and, asc, count, eq, isNotNull, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { materials, optionDefinitions, optionValues } from "@/db/schema";
import type { LocalizedText } from "@/lib/localized";
import { KEY_PATTERN, type OptionType } from "@/lib/options";

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
  if (taken) return { ok: false, field: "key", message: "Já existe uma opção com esta chave" };
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

export async function setOptionArchived(id: string, archived: boolean) {
  await db
    .update(optionDefinitions)
    .set({ archivedAt: archived ? new Date() : null })
    .where(eq(optionDefinitions.id, id));
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
    return { ok: false, field: "key", message: "Já existe um valor com esta chave nesta opção" };
  }
  if (input.materialId) {
    const [material] = await db
      .select({ id: materials.id })
      .from(materials)
      .where(eq(materials.id, input.materialId));
    if (!material) return { ok: false, field: "materialId", message: "Artigo não encontrado" };
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

export async function setValueArchived(id: string, archived: boolean) {
  const [updated] = await db
    .update(optionValues)
    .set({ archivedAt: archived ? new Date() : null })
    .where(eq(optionValues.id, id))
    .returning({ optionId: optionValues.optionId });
  return updated?.optionId ?? null;
}

/** Artigos do ERP para escolher num valor (ex.: o motor que o valor acrescenta). */
export async function listArticlesForPicker() {
  return db
    .select({ id: materials.id, name: materials.name, erpCode: materials.erpCode })
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
