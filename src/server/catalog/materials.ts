import { and, desc, eq, isNotNull, isNull, or, type SQL, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { materialCosts, materials, syncRuns } from "@/db/schema";

export interface MaterialRow {
  id: string;
  erpCode: string;
  name: string;
  unit: string;
  cost: string;
  weightPerUnit: string | null;
  margin: string | null;
  costUpdatedAt: Date;
  erpMissingAt: Date | null;
  /** Custo anterior, se houver histórico. */
  previousCost: string | null;
}

/** Precisa de atenção: margem por decidir ou desapareceu do ERP. */
const needsAttention = or(isNull(materials.margin), isNotNull(materials.erpMissingAt));

/** Filtros da lista (?filtro= no backoffice; o painel e a navegação usam as mesmas chaves). */
export type MaterialFilter = "atencao" | "sem-margem" | "desaparecidos";

const FILTERS: Record<MaterialFilter, SQL | undefined> = {
  atencao: needsAttention,
  "sem-margem": isNull(materials.margin),
  desaparecidos: isNotNull(materials.erpMissingAt),
};

export async function listMaterials({
  attentionOnly = false,
  filter,
}: { attentionOnly?: boolean; filter?: MaterialFilter } = {}): Promise<MaterialRow[]> {
  // Penúltimo custo do histórico, para mostrar a variação.
  const previous = db
    .select({
      materialId: materialCosts.materialId,
      cost: materialCosts.cost,
      rank: sql<number>`row_number() over (partition by ${materialCosts.materialId} order by ${materialCosts.observedAt} desc)`.as(
        "rank",
      ),
    })
    .from(materialCosts)
    .as("previous");

  return db
    .select({
      id: materials.id,
      erpCode: materials.erpCode,
      name: materials.name,
      unit: materials.unit,
      cost: materials.cost,
      weightPerUnit: materials.weightPerUnit,
      margin: materials.margin,
      costUpdatedAt: materials.costUpdatedAt,
      erpMissingAt: materials.erpMissingAt,
      previousCost: previous.cost,
    })
    .from(materials)
    .leftJoin(previous, and(eq(previous.materialId, materials.id), eq(previous.rank, 2)))
    .where(filter ? FILTERS[filter] : attentionOnly ? needsAttention : undefined)
    .orderBy(materials.name);
}

export async function countMaterials() {
  const [counts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      noMargin: sql<number>`count(*) filter (where ${materials.margin} is null)::int`,
      missing: sql<number>`count(*) filter (where ${materials.erpMissingAt} is not null)::int`,
    })
    .from(materials);
  return counts ?? { total: 0, noMargin: 0, missing: 0 };
}

/** fraction: "0.3000"; null = por decidir. Validar antes (lib/percent). */
export async function setMaterialMargin(id: string, fraction: string | null) {
  const updated = await db
    .update(materials)
    .set({ margin: fraction })
    .where(eq(materials.id, id))
    .returning({ id: materials.id });
  return updated.length === 1;
}

export async function listSyncRuns(limit = 10) {
  return db.select().from(syncRuns).orderBy(desc(syncRuns.startedAt)).limit(limit);
}

export async function lastSuccessfulSync() {
  const [run] = await db
    .select({ finishedAt: syncRuns.finishedAt })
    .from(syncRuns)
    .where(or(eq(syncRuns.status, "succeeded"), eq(syncRuns.status, "partial")))
    .orderBy(desc(syncRuns.startedAt))
    .limit(1);
  return run?.finishedAt ?? null;
}

export interface ProductRef {
  id: string;
  name: string;
}

/**
 * Produtos (não arquivados) que usam cada material: em linhas de fórmula (artigo
 * fixo ou escolhido por opção) e como custo extra de um valor de opção. Conta a
 * versão na loja e a que está em preparação, que são as que dão preço.
 */
export async function listMaterialUsage(): Promise<Map<string, ProductRef[]>> {
  const rows = await db.execute<{
    material_id: string;
    product_id: string;
    product_name: string;
  }>(sql`
    with relevant as (
      select v.id as version_id, p.id as product_id, p.name->>'pt' as product_name
      from product_versions v
      join products p on p.id = v.product_id
      where p.archived_at is null
        and (v.id = p.published_version_id or v.status in ('draft', 'validated'))
    )
    select distinct uses.material_id, relevant.product_id, relevant.product_name
    from (
      select fl.material_id, fl.product_version_id
      from formula_lines fl
      where fl.material_id is not null
      union
      select flm.material_id, fl.product_version_id
      from formula_line_materials flm
      join formula_lines fl on fl.id = flm.formula_line_id
      union
      select ov.material_id, po.product_version_id
      from option_values ov
      join product_option_values pov on pov.option_value_id = ov.id
      join product_options po on po.id = pov.product_option_id
      where ov.material_id is not null
    ) uses
    join relevant on relevant.version_id = uses.product_version_id
    order by relevant.product_name
  `);
  const usage = new Map<string, ProductRef[]>();
  for (const row of rows) {
    const list = usage.get(row.material_id) ?? [];
    list.push({ id: row.product_id, name: row.product_name });
    usage.set(row.material_id, list);
  }
  return usage;
}

/** Quantos produtos usam este material (para dizer o efeito de mudar a margem). */
export async function countMaterialUsage(id: string): Promise<number> {
  return (await listMaterialUsage()).get(id)?.length ?? 0;
}
