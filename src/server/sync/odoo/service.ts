import { eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { materialCosts, materials, syncRuns } from "@/db/schema";
import type { Logger } from "@/lib/log";
import type { ErpClient } from "./client";
import { planSync } from "./plan";

export interface SyncSummary {
  runId: string;
  status: "succeeded" | "partial" | "failed" | "skipped";
  inserted: number;
  updated: number;
  costChanges: number;
  missing: number;
  errors: number;
}

// Chave do advisory lock: impede duas sincronizações ao mesmo tempo (cron + botão).
const LOCK_KEY = 74_201_001;

/**
 * Lê o ERP, compara com a cópia local e aplica as mudanças numa transação.
 * Se o ERP falhar, nada muda: a loja continua com os últimos custos e o
 * backoffice mostra a data da última sincronização bem-sucedida.
 */
export async function syncErpMaterials(
  db: Database,
  client: ErpClient,
  log: Logger,
): Promise<SyncSummary> {
  const [run] = await db.insert(syncRuns).values({ source: client.source }).returning();
  const runId = run!.id;
  const empty = { runId, inserted: 0, updated: 0, costChanges: 0, missing: 0, errors: 0 };

  let remote: unknown[];
  try {
    remote = await client.listArticles();
  } catch (error) {
    log.error("erp_sync.read_failed", { runId, error });
    await db
      .update(syncRuns)
      .set({
        status: "failed",
        finishedAt: new Date(),
        errors: [{ message: error instanceof Error ? error.message : String(error) }],
      })
      .where(eq(syncRuns.id, runId));
    return { ...empty, status: "failed", errors: 1 };
  }

  const summary = await db.transaction(async (tx) => {
    const [lock] = await tx.execute<{ locked: boolean }>(
      sql`select pg_try_advisory_xact_lock(${LOCK_KEY}) as locked`,
    );
    if (!lock?.locked) return null;

    const local = await tx
      .select({
        id: materials.id,
        erpCode: materials.erpCode,
        name: materials.name,
        unit: materials.unit,
        cost: materials.cost,
        weightPerUnit: materials.weightPerUnit,
        erpFamily: materials.erpFamily,
        erpMissingAt: materials.erpMissingAt,
      })
      .from(materials);

    const plan = planSync(local, remote);
    const now = new Date();

    for (const article of plan.inserts) {
      const [created] = await tx
        .insert(materials)
        .values({
          erpCode: article.code,
          name: article.name,
          unit: article.unit,
          cost: article.cost,
          weightPerUnit: article.weightPerUnit,
          erpFamily: article.family,
          costUpdatedAt: now,
        })
        .returning({ id: materials.id });
      await tx
        .insert(materialCosts)
        .values({ materialId: created!.id, cost: article.cost, observedAt: now });
    }

    for (const update of plan.updates) {
      await tx
        .update(materials)
        .set({
          name: update.article.name,
          unit: update.article.unit,
          weightPerUnit: update.article.weightPerUnit,
          erpFamily: update.article.family,
          erpMissingAt: null,
          ...(update.costChanged && { cost: update.article.cost, costUpdatedAt: now }),
        })
        .where(eq(materials.id, update.id));
      if (update.costChanged) {
        await tx
          .insert(materialCosts)
          .values({ materialId: update.id, cost: update.article.cost, observedAt: now });
      }
    }

    if (plan.missing.length > 0) {
      await tx
        .update(materials)
        .set({ erpMissingAt: now })
        .where(inArray(materials.id, plan.missing));
    }

    const status = plan.errors.length > 0 ? ("partial" as const) : ("succeeded" as const);
    await tx
      .update(syncRuns)
      .set({
        status,
        finishedAt: new Date(),
        items: plan.inserts.length + plan.updates.length + plan.missing.length,
        errors: plan.errors,
      })
      .where(eq(syncRuns.id, runId));

    return {
      runId,
      status,
      inserted: plan.inserts.length,
      updated: plan.updates.length,
      costChanges: plan.updates.filter((update) => update.costChanged).length,
      missing: plan.missing.length,
      errors: plan.errors.length,
    };
  });

  if (!summary) {
    log.warn("erp_sync.already_running", { runId });
    await db
      .update(syncRuns)
      .set({
        status: "failed",
        finishedAt: new Date(),
        errors: [{ message: "Já havia uma sincronização a correr" }],
      })
      .where(eq(syncRuns.id, runId));
    return { ...empty, status: "skipped" };
  }

  log.info("erp_sync.finished", { ...summary });
  return summary;
}
