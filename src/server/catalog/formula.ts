/**
 * Fórmula de uma versão de produto: variáveis, linhas de custo e consumíveis,
 * e a montagem de tudo no formato do motor de preços (lib/pricing). A mesma
 * montagem serve a pré-visualização no backoffice, o configurador e os orçamentos.
 */
import { and, asc, eq, inArray, isNull, max, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import {
  formulaLineMaterials,
  formulaLines,
  formulaVariables,
  materials,
  optionDefinitions,
  optionRules,
  optionValues,
  productVersions,
  sectors,
} from "@/db/schema";
import type { LocalizedText } from "@/lib/localized";
import { decimalFromCents, parseDecimal } from "@/lib/money";
import { type Condition, conditionsSchema, type ProductOptionDef, type Rule } from "@/lib/options";
import type { FormulaLine, PricedItem, PricingInput } from "@/lib/pricing";
import { editableVersion, listVersionOptions, type Result } from "./products";

// ── Montagem para o motor de preços ─────────────────────────────────────────

export interface OptionMeta {
  key: string;
  name: string;
  type: ProductOptionDef["type"];
  unit: string | null;
  values: { key: string; label: string; isDefault: boolean }[];
  defaultValue: number | string | boolean | null;
}

export interface PricingModel {
  input: Omit<PricingInput, "values">;
  rules: Rule[];
  meta: OptionMeta[];
}

type MaterialRow = typeof materials.$inferSelect;

function materialItem(material: MaterialRow): PricedItem {
  return {
    code: material.erpCode,
    name: material.name,
    unitCost: parseDecimal(material.cost),
    margin: material.margin === null ? null : parseDecimal(material.margin),
  };
}

export async function loadPricingModel(versionId: string): Promise<PricingModel | null> {
  const [version] = await db
    .select()
    .from(productVersions)
    .where(eq(productVersions.id, versionId));
  if (!version) return null;

  const versionOptions = await listVersionOptions(versionId);
  const allMaterialIds = new Set<string>();

  const options: ProductOptionDef[] = [];
  const meta: OptionMeta[] = [];
  const valueComponentIds: Record<string, Record<string, string>> = {};
  for (const { productOption, option, allowed, libraryValues } of versionOptions) {
    const allowedValues = allowed
      .map((row) => ({ row, value: libraryValues.find((value) => value.id === row.optionValueId) }))
      .filter(
        (
          entry,
        ): entry is { row: (typeof allowed)[number]; value: (typeof libraryValues)[number] } =>
          Boolean(entry.value),
      );
    options.push({
      key: option.key,
      type: option.type as ProductOptionDef["type"],
      var: productOption.var,
      required: productOption.required,
      min: productOption.min,
      max: productOption.max,
      step: productOption.step,
      values: allowedValues.map(({ value }) => ({ key: value.key, params: value.params })),
    });
    meta.push({
      key: option.key,
      name: option.name.pt,
      type: option.type as ProductOptionDef["type"],
      unit: option.unit,
      values: allowedValues.map(({ row, value }) => ({
        key: value.key,
        label: value.label.pt,
        isDefault: row.isDefault,
      })),
      defaultValue: productOption.defaultValue ?? null,
    });
    for (const { value } of allowedValues) {
      if (!value.materialId) continue;
      allMaterialIds.add(value.materialId);
      (valueComponentIds[option.key] ??= {})[value.key] = value.materialId;
    }
  }

  const variables = await db
    .select({ name: formulaVariables.name, expr: formulaVariables.expr })
    .from(formulaVariables)
    .where(eq(formulaVariables.productVersionId, versionId))
    .orderBy(asc(formulaVariables.position));

  const lineRows = await db
    .select({ line: formulaLines, sector: sectors, articleOption: optionDefinitions.key })
    .from(formulaLines)
    .leftJoin(sectors, eq(sectors.id, formulaLines.sectorId))
    .leftJoin(optionDefinitions, eq(optionDefinitions.id, formulaLines.articleOptionId))
    .where(eq(formulaLines.productVersionId, versionId))
    .orderBy(asc(formulaLines.position));
  const mappings = lineRows.length
    ? await db
        .select({
          lineId: formulaLineMaterials.formulaLineId,
          valueKey: optionValues.key,
          materialId: formulaLineMaterials.materialId,
        })
        .from(formulaLineMaterials)
        .innerJoin(optionValues, eq(optionValues.id, formulaLineMaterials.optionValueId))
        .where(
          inArray(
            formulaLineMaterials.formulaLineId,
            lineRows.map((row) => row.line.id),
          ),
        )
    : [];
  for (const row of lineRows) if (row.line.materialId) allMaterialIds.add(row.line.materialId);
  for (const mapping of mappings) allMaterialIds.add(mapping.materialId);

  const materialRows = allMaterialIds.size
    ? await db
        .select()
        .from(materials)
        .where(inArray(materials.id, [...allMaterialIds]))
    : [];
  const items = new Map(materialRows.map((material) => [material.id, materialItem(material)]));

  const lines: FormulaLine[] = lineRows.map(({ line, sector, articleOption }) => {
    const base = {
      label: line.label,
      kind: line.kind as FormulaLine["kind"],
      quantityExpr: line.quantityExpr,
      unit: line.unit,
      conditions: line.conditions,
    };
    if (sector) {
      return {
        ...base,
        item: {
          code: sector.name,
          name: sector.name,
          unitCost: decimalFromCents(sector.hourlyRateCents),
          margin: sector.margin === null ? null : parseDecimal(sector.margin),
        },
      };
    }
    if (line.materialId) return { ...base, item: items.get(line.materialId) };
    const byValue: Record<string, PricedItem> = {};
    for (const mapping of mappings.filter((row) => row.lineId === line.id)) {
      const item = items.get(mapping.materialId);
      if (item) byValue[mapping.valueKey] = item;
    }
    return { ...base, itemByOption: { option: articleOption ?? "", items: byValue } };
  });

  const valueComponents: Record<string, Record<string, PricedItem>> = {};
  for (const [optionKey, byValue] of Object.entries(valueComponentIds)) {
    for (const [valueKey, materialId] of Object.entries(byValue)) {
      const item = items.get(materialId);
      if (item) (valueComponents[optionKey] ??= {})[valueKey] = item;
    }
  }

  const ruleRows = await db
    .select()
    .from(optionRules)
    .where(or(eq(optionRules.productVersionId, versionId), isNull(optionRules.productVersionId)))
    .orderBy(asc(optionRules.position));
  const rules: Rule[] = ruleRows.map((rule) => ({
    conditions: rule.conditions,
    effect: rule.effect,
    ...(rule.message && { message: rule.message.pt }),
  }));

  return {
    input: {
      options,
      variables,
      lines,
      valueComponents,
      consumablesRate: parseDecimal(version.consumablesRate),
    },
    rules,
    meta,
  };
}

// ── Edição ──────────────────────────────────────────────────────────────────

const EDIT_LOCKED = { ok: false as const, message: "Esta versão já não se pode editar" };

export async function setConsumablesRate(versionId: string, fraction: string): Promise<Result> {
  return db.transaction(async (tx) => {
    if (!(await editableVersion(tx, versionId))) return EDIT_LOCKED;
    await tx
      .update(productVersions)
      .set({ consumablesRate: fraction })
      .where(eq(productVersions.id, versionId));
    return { ok: true, id: versionId };
  });
}

export async function listVariables(versionId: string) {
  return db
    .select()
    .from(formulaVariables)
    .where(eq(formulaVariables.productVersionId, versionId))
    .orderBy(asc(formulaVariables.position));
}

export const variableInputSchema = z.object({
  name: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]*$/, "Minúsculas, números e _ (ex.: degraus)")
    .max(30),
  expr: z.string().trim().min(1, "Escreva a expressão").max(500),
  label: z.string().trim().max(80),
  showToCustomer: z.boolean(),
});
export type VariableInput = z.infer<typeof variableInputSchema>;

function variableColumns(input: VariableInput) {
  const label: LocalizedText | null = input.label ? { pt: input.label } : null;
  return { name: input.name, expr: input.expr, label, showToCustomer: input.showToCustomer };
}

export async function saveVariable(
  versionId: string,
  id: string | null,
  input: VariableInput,
): Promise<Result<keyof VariableInput>> {
  return db.transaction(async (tx) => {
    if (!(await editableVersion(tx, versionId))) return EDIT_LOCKED;
    const [clash] = await tx
      .select({ id: formulaVariables.id })
      .from(formulaVariables)
      .where(
        and(
          eq(formulaVariables.productVersionId, versionId),
          eq(formulaVariables.name, input.name),
        ),
      );
    if (clash && clash.id !== id) {
      return { ok: false, field: "name", message: "Já há uma variável com este nome" };
    }
    if (id) {
      const updated = await tx
        .update(formulaVariables)
        .set(variableColumns(input))
        .where(and(eq(formulaVariables.id, id), eq(formulaVariables.productVersionId, versionId)))
        .returning({ id: formulaVariables.id });
      if (!updated.length) return { ok: false, message: "Variável não encontrada" };
      return { ok: true, id };
    }
    const [{ last } = { last: null }] = await tx
      .select({ last: max(formulaVariables.position) })
      .from(formulaVariables)
      .where(eq(formulaVariables.productVersionId, versionId));
    const [created] = await tx
      .insert(formulaVariables)
      .values({
        ...variableColumns(input),
        productVersionId: versionId,
        position: (last ?? -1) + 1,
      })
      .returning({ id: formulaVariables.id });
    return { ok: true, id: created!.id };
  });
}

export async function listLines(versionId: string) {
  const lines = await db
    .select()
    .from(formulaLines)
    .where(eq(formulaLines.productVersionId, versionId))
    .orderBy(asc(formulaLines.position));
  const mappings = lines.length
    ? await db
        .select()
        .from(formulaLineMaterials)
        .where(
          inArray(
            formulaLineMaterials.formulaLineId,
            lines.map((line) => line.id),
          ),
        )
    : [];
  return lines.map((line) => ({
    line,
    mapping: mappings.filter((row) => row.formulaLineId === line.id),
  }));
}

export const lineInputSchema = z
  .object({
    label: z.string().trim().min(1, "Escreva o nome da linha").max(80),
    kind: z.enum(["material", "labour", "external", "component"]),
    quantityExpr: z.string().trim().min(1, "Escreva a quantidade").max(500),
    unit: z.string().trim().min(1, "Escreva a unidade").max(16),
    conditions: conditionsSchema,
    source: z.enum(["fixed", "byOption"]),
    sectorId: z.uuid().nullable(),
    materialId: z.uuid().nullable(),
    articleOptionId: z.uuid().nullable(),
    mapping: z.array(z.object({ optionValueId: z.uuid(), materialId: z.uuid() })),
  })
  .superRefine((input, ctx) => {
    if (input.kind === "labour") {
      if (!input.sectorId)
        ctx.addIssue({ code: "custom", path: ["sectorId"], message: "Escolha o sector" });
      return;
    }
    if (input.source === "fixed" && !input.materialId) {
      ctx.addIssue({ code: "custom", path: ["materialId"], message: "Escolha o artigo" });
    }
    if (input.source === "byOption" && !input.articleOptionId) {
      ctx.addIssue({ code: "custom", path: ["articleOptionId"], message: "Escolha a opção" });
    }
  });
export type LineInput = z.infer<typeof lineInputSchema>;

export async function saveLine(
  versionId: string,
  id: string | null,
  input: LineInput,
): Promise<Result<keyof LineInput>> {
  return db.transaction(async (tx) => {
    if (!(await editableVersion(tx, versionId))) return EDIT_LOCKED;
    const labour = input.kind === "labour";
    const byOption = !labour && input.source === "byOption";
    const columns = {
      label: input.label,
      kind: input.kind,
      quantityExpr: input.quantityExpr,
      unit: input.unit,
      conditions: input.conditions as Condition[],
      sectorId: labour ? input.sectorId : null,
      materialId: !labour && !byOption ? input.materialId : null,
      articleOptionId: byOption ? input.articleOptionId : null,
    };

    let lineId = id;
    if (id) {
      const updated = await tx
        .update(formulaLines)
        .set(columns)
        .where(and(eq(formulaLines.id, id), eq(formulaLines.productVersionId, versionId)))
        .returning({ id: formulaLines.id });
      if (!updated.length) return { ok: false, message: "Linha não encontrada" };
    } else {
      const [{ last } = { last: null }] = await tx
        .select({ last: max(formulaLines.position) })
        .from(formulaLines)
        .where(eq(formulaLines.productVersionId, versionId));
      const [created] = await tx
        .insert(formulaLines)
        .values({ ...columns, productVersionId: versionId, position: (last ?? -1) + 1 })
        .returning({ id: formulaLines.id });
      lineId = created!.id;
    }

    await tx.delete(formulaLineMaterials).where(eq(formulaLineMaterials.formulaLineId, lineId!));
    if (byOption && input.mapping.length > 0) {
      await tx
        .insert(formulaLineMaterials)
        .values(input.mapping.map((row) => ({ ...row, formulaLineId: lineId! })));
    }
    return { ok: true, id: lineId! };
  });
}

/** Apaga uma variável ou linha do rascunho (no rascunho apaga-se; nada aponta para ela). */
export async function removeFormulaItem(kind: "variable" | "line", id: string): Promise<Result> {
  const table = kind === "variable" ? formulaVariables : formulaLines;
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ versionId: table.productVersionId })
      .from(table)
      .where(eq(table.id, id));
    if (!row) return { ok: false, message: "Não encontrado" };
    if (!(await editableVersion(tx, row.versionId))) return EDIT_LOCKED;
    await tx.delete(table).where(eq(table.id, id));
    return { ok: true, id };
  });
}

export async function moveFormulaItem(
  kind: "variable" | "line",
  id: string,
  direction: -1 | 1,
): Promise<Result> {
  const table = kind === "variable" ? formulaVariables : formulaLines;
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ versionId: table.productVersionId })
      .from(table)
      .where(eq(table.id, id));
    if (!row) return { ok: false, message: "Não encontrado" };
    if (!(await editableVersion(tx, row.versionId))) return EDIT_LOCKED;
    const siblings = await tx
      .select({ id: table.id })
      .from(table)
      .where(eq(table.productVersionId, row.versionId))
      .orderBy(asc(table.position));
    const index = siblings.findIndex((sibling) => sibling.id === id);
    const other = siblings[index + direction];
    if (!other) return { ok: true, id };
    const ordered = [...siblings];
    [ordered[index], ordered[index + direction]] = [other, siblings[index]!];
    for (const [position, sibling] of ordered.entries()) {
      await tx.update(table).set({ position }).where(eq(table.id, sibling.id));
    }
    return { ok: true, id };
  });
}

/** Para os seletores do editor: artigos do ERP e sectores ativos. */
export async function listFormulaSources() {
  const [articleRows, sectorRows] = await Promise.all([
    db
      .select({
        id: materials.id,
        name: materials.name,
        erpCode: materials.erpCode,
        unit: materials.unit,
      })
      .from(materials)
      .orderBy(asc(materials.name)),
    db
      .select({ id: sectors.id, name: sectors.name })
      .from(sectors)
      .where(isNull(sectors.archivedAt))
      .orderBy(asc(sectors.name)),
  ]);
  return { articles: articleRows, sectors: sectorRows };
}
