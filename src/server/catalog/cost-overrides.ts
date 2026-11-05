/**
 * Custos e margens próprios de um produto (ver productCostOverrides no schema
 * e lib/pricing/overrides). Pertencem à versão: só se mudam numa versão em
 * preparação e só chegam à loja quando ela é publicada.
 */
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  formulaLineMaterials,
  formulaLines,
  materials,
  optionValues,
  productCostOverrides,
  productOptions,
  productOptionValues,
  products,
  productVersions,
  sectors,
} from "@/db/schema";
import { parseDecimal } from "@/lib/money";
import { isStale } from "@/lib/pricing";
import { editableVersion, type Result } from "./products";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CostItem {
  kind: "material" | "sector";
  id: string;
  name: string;
  /** Código do ERP (materiais). */
  code: string | null;
  unit: string | null;
  /** Gerais: custo por unidade (texto decimal) ou por hora (cêntimos), e margem (fração). */
  general: { unitCost: string | null; hourlyRateCents: number | null; margin: string | null };
  /** Próprios deste produto; null = usa o geral. */
  own: {
    unitCost: string | null;
    hourlyRateCents: number | null;
    margin: string | null;
    referenceCost: string | null;
  } | null;
  /** Custo próprio fixado com um custo do ERP que entretanto mudou. */
  stale: boolean;
}

/** Materiais e sectores que a versão usa (linhas da fórmula e valores com artigo). */
export async function listVersionCostItems(versionId: string): Promise<CostItem[]> {
  const lines = await db
    .select({
      id: formulaLines.id,
      materialId: formulaLines.materialId,
      sectorId: formulaLines.sectorId,
    })
    .from(formulaLines)
    .where(eq(formulaLines.productVersionId, versionId));
  const mapped = lines.length
    ? await db
        .select({ materialId: formulaLineMaterials.materialId })
        .from(formulaLineMaterials)
        .where(
          inArray(
            formulaLineMaterials.formulaLineId,
            lines.map((line) => line.id),
          ),
        )
    : [];
  const fromValues = await db
    .select({ materialId: optionValues.materialId })
    .from(productOptionValues)
    .innerJoin(productOptions, eq(productOptions.id, productOptionValues.productOptionId))
    .innerJoin(optionValues, eq(optionValues.id, productOptionValues.optionValueId))
    .where(and(eq(productOptions.productVersionId, versionId), isNotNull(optionValues.materialId)));

  const materialIds = new Set<string>();
  const sectorIds = new Set<string>();
  for (const line of lines) {
    if (line.materialId) materialIds.add(line.materialId);
    if (line.sectorId) sectorIds.add(line.sectorId);
  }
  for (const row of [...mapped, ...fromValues]) if (row.materialId) materialIds.add(row.materialId);

  const [materialRows, sectorRows, overrides] = await Promise.all([
    materialIds.size
      ? db
          .select()
          .from(materials)
          .where(inArray(materials.id, [...materialIds]))
      : Promise.resolve([]),
    sectorIds.size
      ? db
          .select()
          .from(sectors)
          .where(inArray(sectors.id, [...sectorIds]))
      : Promise.resolve([]),
    db
      .select()
      .from(productCostOverrides)
      .where(eq(productCostOverrides.productVersionId, versionId)),
  ]);

  const byMaterial = new Map(overrides.filter((o) => o.materialId).map((o) => [o.materialId!, o]));
  const bySector = new Map(overrides.filter((o) => o.sectorId).map((o) => [o.sectorId!, o]));

  const materialItems: CostItem[] = materialRows
    .sort((a, b) => a.name.localeCompare(b.name, "pt"))
    .map((material) => {
      const own = byMaterial.get(material.id);
      return {
        kind: "material",
        id: material.id,
        name: material.name,
        code: material.erpCode,
        unit: material.unit,
        general: { unitCost: material.cost, hourlyRateCents: null, margin: material.margin },
        own: own
          ? {
              unitCost: own.unitCost,
              hourlyRateCents: null,
              margin: own.margin,
              referenceCost: own.referenceCost,
            }
          : null,
        stale: own
          ? isStale(
              {
                unitCost: own.unitCost === null ? null : parseDecimal(own.unitCost),
                referenceCost: own.referenceCost === null ? null : parseDecimal(own.referenceCost),
              },
              parseDecimal(material.cost),
            )
          : false,
      };
    });
  const sectorItems: CostItem[] = sectorRows
    .sort((a, b) => a.name.localeCompare(b.name, "pt"))
    .map((sector) => {
      const own = bySector.get(sector.id);
      return {
        kind: "sector",
        id: sector.id,
        name: sector.name,
        code: null,
        unit: "h",
        general: { unitCost: null, hourlyRateCents: sector.hourlyRateCents, margin: sector.margin },
        own: own
          ? {
              unitCost: null,
              hourlyRateCents: own.hourlyRateCents,
              margin: own.margin,
              referenceCost: null,
            }
          : null,
        stale: false,
      };
    });
  return [...materialItems, ...sectorItems];
}

export interface OverrideInput {
  kind: "material" | "sector";
  id: string;
  /** Material: custo por unidade em texto decimal ("12.4000"); null = o geral. */
  unitCost: string | null;
  /** Sector: custo por hora em cêntimos; null = o geral. */
  hourlyRateCents: number | null;
  /** Fração ("0.3000"); null = a geral. */
  margin: string | null;
}

/**
 * Grava (ou retira, quando tudo fica null) os valores próprios de um material
 * ou sector nesta versão. O custo do ERP do momento fica como referência do
 * custo fixado, para o aviso quando o ERP mudar.
 */
export async function setCostOverride(versionId: string, input: OverrideInput): Promise<Result> {
  return db.transaction(async (tx) => {
    if (!(await editableVersion(tx, versionId))) {
      return { ok: false, message: "Esta versão já não se pode editar" };
    }
    const target =
      input.kind === "material"
        ? eq(productCostOverrides.materialId, input.id)
        : eq(productCostOverrides.sectorId, input.id);
    const where = and(eq(productCostOverrides.productVersionId, versionId), target);

    const empty =
      input.margin === null &&
      (input.kind === "material" ? input.unitCost === null : input.hourlyRateCents === null);
    if (empty) {
      await tx.delete(productCostOverrides).where(where);
      return { ok: true, id: versionId };
    }

    let referenceCost: string | null = null;
    if (input.kind === "material") {
      const [material] = await tx.select().from(materials).where(eq(materials.id, input.id));
      if (!material) return { ok: false, message: "Material não encontrado" };
      if (input.unitCost !== null) {
        // Mantém a referência se o custo próprio não mudou (o aviso continua a valer).
        const [current] = await tx.select().from(productCostOverrides).where(where);
        referenceCost =
          current?.unitCost === input.unitCost && current.referenceCost
            ? current.referenceCost
            : material.cost;
      }
    } else {
      const [sector] = await tx.select().from(sectors).where(eq(sectors.id, input.id));
      if (!sector) return { ok: false, message: "Sector não encontrado" };
    }

    const values = {
      unitCost: input.kind === "material" ? input.unitCost : null,
      hourlyRateCents: input.kind === "sector" ? input.hourlyRateCents : null,
      margin: input.margin,
      referenceCost,
      updatedAt: new Date(),
    };
    const updated = await tx
      .update(productCostOverrides)
      .set(values)
      .where(where)
      .returning({ id: productCostOverrides.id });
    if (updated.length === 0) {
      await tx.insert(productCostOverrides).values({
        productVersionId: versionId,
        materialId: input.kind === "material" ? input.id : null,
        sectorId: input.kind === "sector" ? input.id : null,
        ...values,
      });
    }
    return { ok: true, id: versionId };
  });
}

/** Na criação de uma versão nova: leva os valores próprios da versão de origem. */
export async function copyCostOverrides(tx: Tx, fromVersionId: string, toVersionId: string) {
  await tx.execute(sql`
    insert into product_cost_overrides
      (product_version_id, material_id, sector_id, unit_cost, hourly_rate_cents, margin, reference_cost)
    select ${toVersionId}, material_id, sector_id, unit_cost, hourly_rate_cents, margin, reference_cost
    from product_cost_overrides where product_version_id = ${fromVersionId}`);
}

export interface StaleOverride {
  productId: string;
  productName: string;
  version: number;
  status: string;
  materialName: string;
  unit: string;
  ownCost: string;
  erpCost: string;
}

/**
 * Custos próprios fixados com um custo do ERP que entretanto mudou, nos
 * produtos em uso (versão na loja e versões em preparação).
 */
export async function listStaleCostOverrides(): Promise<StaleOverride[]> {
  const rows = await db
    .select({
      productId: products.id,
      productName: products.name,
      version: productVersions.version,
      status: productVersions.status,
      publishedVersionId: products.publishedVersionId,
      versionId: productVersions.id,
      materialName: materials.name,
      unit: materials.unit,
      ownCost: productCostOverrides.unitCost,
      referenceCost: productCostOverrides.referenceCost,
      erpCost: materials.cost,
    })
    .from(productCostOverrides)
    .innerJoin(productVersions, eq(productVersions.id, productCostOverrides.productVersionId))
    .innerJoin(products, eq(products.id, productVersions.productId))
    .innerJoin(materials, eq(materials.id, productCostOverrides.materialId))
    .where(isNotNull(productCostOverrides.unitCost));
  return rows
    .filter(
      (row) =>
        (row.versionId === row.publishedVersionId || row.status !== "published") &&
        isStale(
          {
            unitCost: row.ownCost === null ? null : parseDecimal(row.ownCost),
            referenceCost: row.referenceCost === null ? null : parseDecimal(row.referenceCost),
          },
          parseDecimal(row.erpCost),
        ),
    )
    .map((row) => ({
      productId: row.productId,
      productName: row.productName.pt,
      version: row.version,
      status: row.status,
      materialName: row.materialName,
      unit: row.unit,
      ownCost: row.ownCost!,
      erpCost: row.erpCost,
    }));
}

/**
 * Muda um só campo (custo ou margem) e mantém o outro. `value` null = volta ao geral.
 * Para o custo: texto decimal (material) ou cêntimos em texto (sector).
 */
export async function patchCostOverride(
  versionId: string,
  kind: "material" | "sector",
  id: string,
  field: "cost" | "margin",
  value: string | null,
): Promise<Result> {
  const [current] = await db
    .select()
    .from(productCostOverrides)
    .where(
      and(
        eq(productCostOverrides.productVersionId, versionId),
        kind === "material"
          ? eq(productCostOverrides.materialId, id)
          : eq(productCostOverrides.sectorId, id),
      ),
    );
  const input: OverrideInput = {
    kind,
    id,
    unitCost: current?.unitCost ?? null,
    hourlyRateCents: current?.hourlyRateCents ?? null,
    margin: current?.margin ?? null,
  };
  if (field === "margin") input.margin = value;
  else if (kind === "material") input.unitCost = value;
  else input.hourlyRateCents = value === null ? null : Number(value);
  return setCostOverride(versionId, input);
}
