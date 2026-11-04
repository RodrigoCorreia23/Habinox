import { and, desc, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
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

export async function listMaterials({ attentionOnly = false } = {}): Promise<MaterialRow[]> {
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
    .where(attentionOnly ? needsAttention : undefined)
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
