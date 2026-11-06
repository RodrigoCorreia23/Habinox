/**
 * Construtor de produto: o produto visto como o Bruno o pensa — divisões
 * (Altura, Motorização, Cor…), as opções de cada uma, o artigo e a margem de
 * cada opção, e a «Base do produto» (o que entra sempre). Por baixo escreve nas
 * tabelas de sempre (option_definitions do produto, product_options,
 * formula_lines com `builder` e `margin`), por isso o motor de preços, as
 * regras, as versões e a loja não mudam.
 */
import { and, asc, eq, inArray, isNotNull, isNull, max, ne, or } from "drizzle-orm";
import { db } from "@/db/client";
import {
  formulaLines,
  materials,
  optionDefinitions,
  optionValues,
  productOptions,
  productOptionValues,
  products,
  productVersions,
  sectors,
} from "@/db/schema";
import type { LocalizedText } from "@/lib/localized";
import { type Condition, keyFromName, suggestVarName } from "@/lib/options";
import { BASIS_NEEDS, type BuilderSpec, builderExpression } from "@/lib/pricing/builder";
import { editableVersion, type Result } from "./products";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const LOCKED: Result = { ok: false, message: "Esta versão já não se pode editar" };

export type DivisionType = "dimension" | "number" | "choice" | "boolean";
export type Role = "width" | "height" | "other";

export interface BuilderCost {
  lineId: string;
  source: "material" | "sector";
  itemId: string;
  itemName: string;
  unit: string;
  spec: BuilderSpec;
  /** Fração em texto ("0.3000"); null = por escrever. */
  margin: string | null;
}

export interface BuilderValue {
  id: string;
  key: string;
  name: string;
  isDefault: boolean;
  cost: BuilderCost | null;
}

export interface BuilderDivision {
  productOptionId: string;
  optionId: string;
  key: string;
  name: string;
  type: DivisionType;
  /** Divisão deste produto (editável); false = opção partilhada da biblioteca. */
  owned: boolean;
  role: Role;
  unit: string | null;
  min: number | null;
  max: number | null;
  step: number | null;
  required: boolean;
  values: BuilderValue[];
}

export interface BuilderData {
  divisions: BuilderDivision[];
  base: (BuilderCost & { label: string })[];
  /** Linhas de fórmula escritas à mão (vista avançada). */
  advancedLines: number;
  hasWidth: boolean;
  hasHeight: boolean;
}

const roleOf = (variable: string | null): Role =>
  variable === "L" ? "width" : variable === "H" ? "height" : "other";

/** Condição que liga uma linha de custo a uma opção: «Cor é Preto». */
function valueCondition(optionKey: string, valueKey: string): Condition[] {
  return [{ option: optionKey, op: "in", values: [valueKey] }];
}

function lineValue(conditions: Condition[]): { option: string; value: string } | null {
  const [only] = conditions;
  if (conditions.length !== 1 || !only || only.op !== "in" || only.values.length !== 1) return null;
  return { option: only.option, value: only.values[0]! };
}

export async function getBuilderData(versionId: string): Promise<BuilderData> {
  const [version] = await db
    .select({ productId: productVersions.productId })
    .from(productVersions)
    .where(eq(productVersions.id, versionId));
  const optionRows = await db
    .select({ productOption: productOptions, option: optionDefinitions })
    .from(productOptions)
    .innerJoin(optionDefinitions, eq(optionDefinitions.id, productOptions.optionId))
    .where(eq(productOptions.productVersionId, versionId))
    .orderBy(asc(productOptions.position));
  const allowed = optionRows.length
    ? await db
        .select({ allowed: productOptionValues, value: optionValues })
        .from(productOptionValues)
        .innerJoin(optionValues, eq(optionValues.id, productOptionValues.optionValueId))
        .where(
          inArray(
            productOptionValues.productOptionId,
            optionRows.map((row) => row.productOption.id),
          ),
        )
        .orderBy(asc(productOptionValues.position))
    : [];
  const lines = await db
    .select({ line: formulaLines, material: materials, sector: sectors })
    .from(formulaLines)
    .leftJoin(materials, eq(materials.id, formulaLines.materialId))
    .leftJoin(sectors, eq(sectors.id, formulaLines.sectorId))
    .where(eq(formulaLines.productVersionId, versionId))
    .orderBy(asc(formulaLines.position));

  const toCost = (row: (typeof lines)[number]): BuilderCost | null => {
    const { line, material, sector } = row;
    if (!line.builder) return null;
    if (sector) {
      return {
        lineId: line.id,
        source: "sector",
        itemId: sector.id,
        itemName: sector.name,
        unit: "h",
        spec: line.builder,
        margin: line.margin,
      };
    }
    if (material) {
      return {
        lineId: line.id,
        source: "material",
        itemId: material.id,
        itemName: material.name,
        unit: material.unit,
        spec: line.builder,
        margin: line.margin,
      };
    }
    return null;
  };

  const costByValue = new Map<string, BuilderCost>();
  const base: BuilderData["base"] = [];
  let advancedLines = 0;
  for (const row of lines) {
    if (!row.line.builder) {
      advancedLines++;
      continue;
    }
    const cost = toCost(row);
    if (!cost) continue;
    const link = lineValue(row.line.conditions);
    if (link) costByValue.set(`${link.option}|${link.value}`, cost);
    else if (row.line.conditions.length === 0) base.push({ ...cost, label: row.line.label });
    else advancedLines++;
  }

  const divisions: BuilderDivision[] = optionRows.map(({ productOption, option }) => ({
    productOptionId: productOption.id,
    optionId: option.id,
    key: option.key,
    name: option.name.pt,
    type: option.type as DivisionType,
    owned: option.productId !== null && option.productId === version?.productId,
    role: roleOf(productOption.var),
    unit: option.unit,
    min: productOption.min,
    max: productOption.max,
    step: productOption.step,
    required: productOption.required,
    values: allowed
      .filter((row) => row.allowed.productOptionId === productOption.id)
      .map((row) => ({
        id: row.value.id,
        key: row.value.key,
        name: row.value.label.pt,
        isDefault: row.allowed.isDefault,
        cost: costByValue.get(`${option.key}|${row.value.key}`) ?? null,
      })),
  }));

  return {
    divisions,
    base,
    advancedLines,
    hasWidth: divisions.some((d) => d.role === "width"),
    hasHeight: divisions.some((d) => d.role === "height"),
  };
}

/** Artigos do ERP e secções da oficina para escolher. */
export async function listBuilderSources() {
  const [articles, workshop] = await Promise.all([
    db
      .select({
        id: materials.id,
        name: materials.name,
        code: materials.erpCode,
        unit: materials.unit,
        cost: materials.cost,
        family: materials.erpFamily,
      })
      .from(materials)
      .where(isNull(materials.erpMissingAt))
      .orderBy(asc(materials.name)),
    db
      .select({ id: sectors.id, name: sectors.name, rateCents: sectors.hourlyRateCents })
      .from(sectors)
      .where(isNull(sectors.archivedAt))
      .orderBy(asc(sectors.name)),
  ]);
  return { articles, sectors: workshop };
}

// ── Divisões ────────────────────────────────────────────────────────────────

async function uniqueKey(
  tx: Tx,
  productId: string,
  name: string,
  table: "option" | "value",
  optionId?: string,
) {
  const base = keyFromName(name) || (table === "option" ? "divisao" : "opcao");
  const existing =
    table === "option"
      ? await tx
          .select({ key: optionDefinitions.key })
          .from(optionDefinitions)
          .where(eq(optionDefinitions.productId, productId))
      : await tx
          .select({ key: optionValues.key })
          .from(optionValues)
          .where(eq(optionValues.optionId, optionId!));
  const taken = new Set(existing.map((row) => row.key));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}_${n}`)) return `${base}_${n}`;
}

async function freeVar(
  tx: Tx,
  versionId: string,
  wanted: string | null,
  name: string,
  except?: string,
) {
  const rows = await tx
    .select({ var: productOptions.var, key: optionDefinitions.key, id: productOptions.id })
    .from(productOptions)
    .innerJoin(optionDefinitions, eq(optionDefinitions.id, productOptions.optionId))
    .where(eq(productOptions.productVersionId, versionId));
  const others = rows.filter((row) => row.id !== except);
  const taken = others.flatMap((row) => (row.var ? [row.var, row.key] : [row.key]));
  if (wanted && !taken.map((t) => t.toUpperCase()).includes(wanted)) return wanted;
  return suggestVarName(name, wanted ? [...taken, wanted] : taken);
}

async function productOf(tx: Tx, versionId: string) {
  const [row] = await tx
    .select({ productId: productVersions.productId })
    .from(productVersions)
    .where(eq(productVersions.id, versionId));
  return row?.productId ?? null;
}

export async function addDivision(
  versionId: string,
  input: { name: string; type: DivisionType; role?: Role },
): Promise<Result> {
  return db.transaction(async (tx) => {
    if (!(await editableVersion(tx, versionId))) return LOCKED;
    const productId = await productOf(tx, versionId);
    if (!productId) return { ok: false, message: "Produto não encontrado" };
    const key = await uniqueKey(tx, productId, input.name, "option");
    const [option] = await tx
      .insert(optionDefinitions)
      .values({
        key,
        name: { pt: input.name } satisfies LocalizedText,
        type: input.type,
        unit: input.type === "dimension" ? "mm" : null,
        display: input.type === "choice" ? "pills" : null,
        productId,
      })
      .returning({ id: optionDefinitions.id });
    const [{ last } = { last: null }] = await tx
      .select({ last: max(productOptions.position) })
      .from(productOptions)
      .where(eq(productOptions.productVersionId, versionId));
    const wanted = input.role === "width" ? "L" : input.role === "height" ? "H" : null;
    const variable =
      input.type === "dimension" || input.type === "number"
        ? await freeVar(tx, versionId, wanted, input.name)
        : null;
    const [created] = await tx
      .insert(productOptions)
      .values({
        productVersionId: versionId,
        optionId: option!.id,
        position: (last ?? -1) + 1,
        required: input.type !== "boolean",
        var: variable,
        step: input.type === "dimension" ? 10 : null,
      })
      .returning({ id: productOptions.id });
    return { ok: true, id: created!.id };
  });
}

/** O nome só se muda numa divisão deste produto (as da biblioteca mudam-se em Opções). */
export async function updateDivision(
  versionId: string,
  productOptionId: string,
  input: {
    name?: string;
    role?: Role;
    min?: number | null;
    max?: number | null;
    step?: number | null;
    required?: boolean;
  },
): Promise<Result> {
  return db.transaction(async (tx) => {
    if (!(await editableVersion(tx, versionId))) return LOCKED;
    const productId = await productOf(tx, versionId);
    const [row] = await tx
      .select({ productOption: productOptions, option: optionDefinitions })
      .from(productOptions)
      .innerJoin(optionDefinitions, eq(optionDefinitions.id, productOptions.optionId))
      .where(
        and(eq(productOptions.id, productOptionId), eq(productOptions.productVersionId, versionId)),
      );
    if (!row) return { ok: false, message: "Divisão não encontrada" };

    if (input.name !== undefined && input.name !== row.option.name.pt) {
      if (row.option.productId !== productId) {
        return { ok: false, message: "Esta divisão vem da biblioteca: o nome muda-se em Opções" };
      }
      await tx
        .update(optionDefinitions)
        .set({ name: { ...row.option.name, pt: input.name } })
        .where(eq(optionDefinitions.id, row.option.id));
    }

    const changes: Partial<typeof productOptions.$inferInsert> = {};
    if (input.min !== undefined) changes.min = input.min;
    if (input.max !== undefined) changes.max = input.max;
    if (input.step !== undefined) changes.step = input.step;
    if (input.required !== undefined) changes.required = input.required;
    if (input.role !== undefined) {
      const wanted = input.role === "width" ? "L" : input.role === "height" ? "H" : null;
      if (wanted) {
        // Só uma largura e uma altura por produto: quem a tinha passa a «outra».
        const holders = await tx
          .select({ id: productOptions.id })
          .from(productOptions)
          .where(
            and(
              eq(productOptions.productVersionId, versionId),
              eq(productOptions.var, wanted),
              ne(productOptions.id, productOptionId),
            ),
          );
        for (const holder of holders) {
          await tx
            .update(productOptions)
            .set({ var: null })
            .where(eq(productOptions.id, holder.id));
        }
        changes.var = wanted;
      } else if (row.productOption.var === "L" || row.productOption.var === "H") {
        changes.var = await freeVar(
          tx,
          versionId,
          null,
          input.name ?? row.option.name.pt,
          productOptionId,
        );
        if (changes.var === "L" || changes.var === "H") changes.var = null;
      }
    }
    if (
      (changes.min ?? row.productOption.min) !== null &&
      (changes.max ?? row.productOption.max) !== null &&
      (changes.min ?? row.productOption.min)! > (changes.max ?? row.productOption.max)!
    ) {
      return { ok: false, message: "O mínimo não pode ser maior do que o máximo" };
    }
    if (Object.keys(changes).length > 0) {
      await tx.update(productOptions).set(changes).where(eq(productOptions.id, productOptionId));
    }
    return { ok: true, id: productOptionId };
  });
}

/** Tira a divisão do produto, com as linhas de custo das suas opções. */
export async function removeDivision(versionId: string, productOptionId: string): Promise<Result> {
  return db.transaction(async (tx) => {
    if (!(await editableVersion(tx, versionId))) return LOCKED;
    const [row] = await tx
      .select({ key: optionDefinitions.key })
      .from(productOptions)
      .innerJoin(optionDefinitions, eq(optionDefinitions.id, productOptions.optionId))
      .where(
        and(eq(productOptions.id, productOptionId), eq(productOptions.productVersionId, versionId)),
      );
    if (!row) return { ok: false, message: "Divisão não encontrada" };
    const lines = await tx
      .select({ id: formulaLines.id, conditions: formulaLines.conditions })
      .from(formulaLines)
      .where(and(eq(formulaLines.productVersionId, versionId), isNotNull(formulaLines.builder)));
    const linked = lines.filter((line) => lineValue(line.conditions)?.option === row.key);
    if (linked.length)
      await tx.delete(formulaLines).where(
        inArray(
          formulaLines.id,
          linked.map((l) => l.id),
        ),
      );
    await tx.delete(productOptions).where(eq(productOptions.id, productOptionId));
    return { ok: true, id: productOptionId };
  });
}

// ── Opções de uma divisão ───────────────────────────────────────────────────

export async function addValue(
  versionId: string,
  productOptionId: string,
  name: string,
): Promise<Result> {
  return db.transaction(async (tx) => {
    if (!(await editableVersion(tx, versionId))) return LOCKED;
    const productId = await productOf(tx, versionId);
    const [row] = await tx
      .select({ option: optionDefinitions })
      .from(productOptions)
      .innerJoin(optionDefinitions, eq(optionDefinitions.id, productOptions.optionId))
      .where(
        and(eq(productOptions.id, productOptionId), eq(productOptions.productVersionId, versionId)),
      );
    if (!row) return { ok: false, message: "Divisão não encontrada" };
    if (row.option.type !== "choice") return { ok: false, message: "Só as escolhas têm opções" };
    if (row.option.productId !== productId) {
      return {
        ok: false,
        message: "Esta divisão vem da biblioteca: as opções acrescentam-se em Opções",
      };
    }
    const key = await uniqueKey(tx, productId!, name, "value", row.option.id);
    const [{ last } = { last: null }] = await tx
      .select({ last: max(optionValues.position) })
      .from(optionValues)
      .where(eq(optionValues.optionId, row.option.id));
    const [value] = await tx
      .insert(optionValues)
      .values({
        optionId: row.option.id,
        key,
        label: { pt: name },
        position: (last ?? -1) + 1,
        params: {},
      })
      .returning({ id: optionValues.id });
    const current = await tx
      .select({ position: productOptionValues.position })
      .from(productOptionValues)
      .where(eq(productOptionValues.productOptionId, productOptionId));
    await tx.insert(productOptionValues).values({
      productOptionId,
      optionValueId: value!.id,
      position: Math.max(-1, ...current.map((c) => c.position)) + 1,
      isDefault: current.length === 0,
    });
    return { ok: true, id: value!.id };
  });
}

export async function renameValue(
  versionId: string,
  valueId: string,
  name: string,
): Promise<Result> {
  return db.transaction(async (tx) => {
    if (!(await editableVersion(tx, versionId))) return LOCKED;
    const productId = await productOf(tx, versionId);
    const [row] = await tx
      .select({ value: optionValues, option: optionDefinitions })
      .from(optionValues)
      .innerJoin(optionDefinitions, eq(optionDefinitions.id, optionValues.optionId))
      .where(eq(optionValues.id, valueId));
    if (!row) return { ok: false, message: "Opção não encontrada" };
    if (row.option.productId !== productId) {
      return { ok: false, message: "Esta opção vem da biblioteca: o nome muda-se em Opções" };
    }
    await tx
      .update(optionValues)
      .set({ label: { ...row.value.label, pt: name } })
      .where(eq(optionValues.id, valueId));
    return { ok: true, id: valueId };
  });
}

export async function removeValue(
  versionId: string,
  productOptionId: string,
  valueId: string,
): Promise<Result> {
  return db.transaction(async (tx) => {
    if (!(await editableVersion(tx, versionId))) return LOCKED;
    const [row] = await tx
      .select({ allowed: productOptionValues, value: optionValues, option: optionDefinitions })
      .from(productOptionValues)
      .innerJoin(optionValues, eq(optionValues.id, productOptionValues.optionValueId))
      .innerJoin(optionDefinitions, eq(optionDefinitions.id, optionValues.optionId))
      .innerJoin(productOptions, eq(productOptions.id, productOptionValues.productOptionId))
      .where(
        and(
          eq(productOptionValues.productOptionId, productOptionId),
          eq(productOptionValues.optionValueId, valueId),
          eq(productOptions.productVersionId, versionId),
        ),
      );
    if (!row) return { ok: false, message: "Opção não encontrada" };
    await deleteValueLine(tx, versionId, row.option.key, row.value.key);
    await tx
      .delete(productOptionValues)
      .where(
        and(
          eq(productOptionValues.productOptionId, productOptionId),
          eq(productOptionValues.optionValueId, valueId),
        ),
      );
    if (row.allowed.isDefault) {
      const [first] = await tx
        .select({ id: productOptionValues.optionValueId })
        .from(productOptionValues)
        .where(eq(productOptionValues.productOptionId, productOptionId))
        .orderBy(asc(productOptionValues.position))
        .limit(1);
      if (first) {
        await tx
          .update(productOptionValues)
          .set({ isDefault: true })
          .where(
            and(
              eq(productOptionValues.productOptionId, productOptionId),
              eq(productOptionValues.optionValueId, first.id),
            ),
          );
      }
    }
    return { ok: true, id: valueId };
  });
}

export async function setDefaultValue(
  versionId: string,
  productOptionId: string,
  valueId: string,
): Promise<Result> {
  return db.transaction(async (tx) => {
    if (!(await editableVersion(tx, versionId))) return LOCKED;
    const [owner] = await tx
      .select({ id: productOptions.id })
      .from(productOptions)
      .where(
        and(eq(productOptions.id, productOptionId), eq(productOptions.productVersionId, versionId)),
      );
    if (!owner) return { ok: false, message: "Divisão não encontrada" };
    await tx
      .update(productOptionValues)
      .set({ isDefault: false })
      .where(eq(productOptionValues.productOptionId, productOptionId));
    await tx
      .update(productOptionValues)
      .set({ isDefault: true })
      .where(
        and(
          eq(productOptionValues.productOptionId, productOptionId),
          eq(productOptionValues.optionValueId, valueId),
        ),
      );
    return { ok: true, id: valueId };
  });
}

// ── Custos (opções e base) ──────────────────────────────────────────────────

export interface CostInput {
  source: "material" | "sector";
  itemId: string;
  spec: BuilderSpec;
  /** Fração em texto; null = por escrever (o produto não publica). */
  margin: string | null;
}

async function deleteValueLine(tx: Tx, versionId: string, optionKey: string, valueKey: string) {
  const lines = await tx
    .select({ id: formulaLines.id, conditions: formulaLines.conditions })
    .from(formulaLines)
    .where(and(eq(formulaLines.productVersionId, versionId), isNotNull(formulaLines.builder)));
  const ids = lines
    .filter((line) => {
      const link = lineValue(line.conditions);
      return link?.option === optionKey && link.value === valueKey;
    })
    .map((line) => line.id);
  if (ids.length) await tx.delete(formulaLines).where(inArray(formulaLines.id, ids));
}

async function checkCost(tx: Tx, versionId: string, input: CostInput) {
  const roles = await tx
    .select({ var: productOptions.var })
    .from(productOptions)
    .where(
      and(
        eq(productOptions.productVersionId, versionId),
        or(eq(productOptions.var, "L"), eq(productOptions.var, "H")),
      ),
    );
  const has = new Set(roles.map((row) => row.var));
  const missing = BASIS_NEEDS[input.spec.basis].filter((v) => !has.has(v));
  if (missing.length) {
    const names = missing.map((v) => (v === "L" ? "a largura" : "a altura")).join(" e ");
    return `Para contar assim, marque nas medidas qual é ${names}`;
  }
  if (input.source === "material") {
    const [material] = await tx.select().from(materials).where(eq(materials.id, input.itemId));
    if (!material) return "Esse artigo já não existe no ERP";
    return { unit: material.unit, kind: "material" as const, name: material.name };
  }
  const [sector] = await tx.select().from(sectors).where(eq(sectors.id, input.itemId));
  if (!sector) return "Essa secção da oficina já não existe";
  return { unit: "h", kind: "labour" as const, name: sector.name };
}

async function nextLinePosition(tx: Tx, versionId: string) {
  const [{ last } = { last: null }] = await tx
    .select({ last: max(formulaLines.position) })
    .from(formulaLines)
    .where(eq(formulaLines.productVersionId, versionId));
  return (last ?? -1) + 1;
}

/** Custo de uma opção (ex.: «Preto» → RAL 9005, por m², margem 20 %). null = sem custo. */
export async function setValueCost(
  versionId: string,
  productOptionId: string,
  valueId: string,
  input: CostInput | null,
): Promise<Result> {
  return db.transaction(async (tx) => {
    if (!(await editableVersion(tx, versionId))) return LOCKED;
    const [row] = await tx
      .select({ option: optionDefinitions, value: optionValues })
      .from(productOptionValues)
      .innerJoin(productOptions, eq(productOptions.id, productOptionValues.productOptionId))
      .innerJoin(optionDefinitions, eq(optionDefinitions.id, productOptions.optionId))
      .innerJoin(optionValues, eq(optionValues.id, productOptionValues.optionValueId))
      .where(
        and(
          eq(productOptionValues.productOptionId, productOptionId),
          eq(productOptionValues.optionValueId, valueId),
          eq(productOptions.productVersionId, versionId),
        ),
      );
    if (!row) return { ok: false, message: "Opção não encontrada" };
    await deleteValueLine(tx, versionId, row.option.key, row.value.key);
    if (!input) return { ok: true, id: valueId };
    const checked = await checkCost(tx, versionId, input);
    if (typeof checked === "string") return { ok: false, message: checked };
    await tx.insert(formulaLines).values({
      productVersionId: versionId,
      position: await nextLinePosition(tx, versionId),
      label: `${row.option.name.pt}: ${row.value.label.pt}`,
      kind: checked.kind,
      quantityExpr: builderExpression(input.spec),
      unit: checked.unit,
      conditions: valueCondition(row.option.key, row.value.key),
      materialId: input.source === "material" ? input.itemId : null,
      sectorId: input.source === "sector" ? input.itemId : null,
      margin: input.margin,
      builder: input.spec,
    });
    return { ok: true, id: valueId };
  });
}

/** Linha da Base do produto (entra sempre). lineId null = nova. */
export async function saveBaseLine(
  versionId: string,
  lineId: string | null,
  label: string,
  input: CostInput,
): Promise<Result> {
  return db.transaction(async (tx) => {
    if (!(await editableVersion(tx, versionId))) return LOCKED;
    const checked = await checkCost(tx, versionId, input);
    if (typeof checked === "string") return { ok: false, message: checked };
    const values = {
      label: label || checked.name,
      kind: checked.kind,
      quantityExpr: builderExpression(input.spec),
      unit: checked.unit,
      conditions: [] as Condition[],
      materialId: input.source === "material" ? input.itemId : null,
      sectorId: input.source === "sector" ? input.itemId : null,
      articleOptionId: null,
      margin: input.margin,
      builder: input.spec,
    };
    if (lineId) {
      const updated = await tx
        .update(formulaLines)
        .set(values)
        .where(and(eq(formulaLines.id, lineId), eq(formulaLines.productVersionId, versionId)))
        .returning({ id: formulaLines.id });
      if (!updated.length) return { ok: false, message: "Linha não encontrada" };
      return { ok: true, id: lineId };
    }
    const [created] = await tx
      .insert(formulaLines)
      .values({
        productVersionId: versionId,
        position: await nextLinePosition(tx, versionId),
        ...values,
      })
      .returning({ id: formulaLines.id });
    return { ok: true, id: created!.id };
  });
}

export async function removeBaseLine(versionId: string, lineId: string): Promise<Result> {
  return db.transaction(async (tx) => {
    if (!(await editableVersion(tx, versionId))) return LOCKED;
    await tx
      .delete(formulaLines)
      .where(and(eq(formulaLines.id, lineId), eq(formulaLines.productVersionId, versionId)));
    return { ok: true, id: lineId };
  });
}

// ── Copiar uma divisão de outro produto ─────────────────────────────────────

/** Divisões de outros produtos (versão na loja ou em preparação) que se podem copiar. */
export async function listCopyableDivisions(productId: string) {
  const rows = await db
    .select({
      productOptionId: productOptions.id,
      division: optionDefinitions.name,
      type: optionDefinitions.type,
      product: products.name,
      versionId: productVersions.id,
      status: productVersions.status,
      publishedVersionId: products.publishedVersionId,
    })
    .from(productOptions)
    .innerJoin(optionDefinitions, eq(optionDefinitions.id, productOptions.optionId))
    .innerJoin(productVersions, eq(productVersions.id, productOptions.productVersionId))
    .innerJoin(products, eq(products.id, productVersions.productId))
    .where(and(ne(products.id, productId), isNull(products.archivedAt)))
    .orderBy(asc(products.name), asc(productOptions.position));
  return rows
    .filter((row) => row.versionId === row.publishedVersionId || row.status !== "published")
    .map((row) => ({
      productOptionId: row.productOptionId,
      label: `${row.division.pt} — de ${row.product.pt}`,
      type: row.type,
    }));
}

/**
 * Copia a divisão (nome, opções, limites e o custo/margem de cada opção) para
 * este produto, como divisão própria: daí em diante muda-se à vontade.
 */
export async function copyDivision(
  versionId: string,
  fromProductOptionId: string,
): Promise<Result> {
  return db.transaction(async (tx) => {
    if (!(await editableVersion(tx, versionId))) return LOCKED;
    const productId = await productOf(tx, versionId);
    if (!productId) return { ok: false, message: "Produto não encontrado" };
    const [source] = await tx
      .select({ productOption: productOptions, option: optionDefinitions })
      .from(productOptions)
      .innerJoin(optionDefinitions, eq(optionDefinitions.id, productOptions.optionId))
      .where(eq(productOptions.id, fromProductOptionId));
    if (!source) return { ok: false, message: "Divisão não encontrada" };

    const key = await uniqueKey(tx, productId, source.option.name.pt, "option");
    const [option] = await tx
      .insert(optionDefinitions)
      .values({
        key,
        name: source.option.name,
        type: source.option.type,
        unit: source.option.unit,
        display: source.option.display,
        helpText: source.option.helpText,
        productId,
      })
      .returning({ id: optionDefinitions.id });

    const [{ last } = { last: null }] = await tx
      .select({ last: max(productOptions.position) })
      .from(productOptions)
      .where(eq(productOptions.productVersionId, versionId));
    const variable =
      source.productOption.var === "L" || source.productOption.var === "H"
        ? await freeVar(tx, versionId, source.productOption.var, source.option.name.pt)
        : source.option.type === "dimension" || source.option.type === "number"
          ? await freeVar(tx, versionId, null, source.option.name.pt)
          : null;
    const [created] = await tx
      .insert(productOptions)
      .values({
        productVersionId: versionId,
        optionId: option!.id,
        position: (last ?? -1) + 1,
        var: variable,
        required: source.productOption.required,
        min: source.productOption.min,
        max: source.productOption.max,
        step: source.productOption.step,
      })
      .returning({ id: productOptions.id });

    const values = await tx
      .select({ allowed: productOptionValues, value: optionValues })
      .from(productOptionValues)
      .innerJoin(optionValues, eq(optionValues.id, productOptionValues.optionValueId))
      .where(eq(productOptionValues.productOptionId, fromProductOptionId))
      .orderBy(asc(productOptionValues.position));
    const sourceLines = await tx
      .select()
      .from(formulaLines)
      .where(
        and(
          eq(formulaLines.productVersionId, source.productOption.productVersionId),
          isNotNull(formulaLines.builder),
        ),
      );
    let position = await nextLinePosition(tx, versionId);
    for (const [index, { allowed, value }] of values.entries()) {
      const [copy] = await tx
        .insert(optionValues)
        .values({
          optionId: option!.id,
          key: value.key,
          label: value.label,
          position: index,
          params: value.params,
          ralCode: value.ralCode,
          swatchHex: value.swatchHex,
          materialId: value.materialId,
          asksText: value.asksText,
        })
        .returning({ id: optionValues.id });
      await tx.insert(productOptionValues).values({
        productOptionId: created!.id,
        optionValueId: copy!.id,
        position: index,
        isDefault: allowed.isDefault,
      });
      const line = sourceLines.find((candidate) => {
        const link = lineValue(candidate.conditions);
        return link?.option === source.option.key && link.value === value.key;
      });
      if (line) {
        const {
          id: _id,
          productVersionId: _v,
          position: _p,
          conditions: _c,
          label: _l,
          ...rest
        } = line;
        await tx.insert(formulaLines).values({
          ...rest,
          productVersionId: versionId,
          position: position++,
          label: `${source.option.name.pt}: ${value.label.pt}`,
          conditions: valueCondition(key, value.key),
        });
      }
    }
    return { ok: true, id: created!.id };
  });
}
