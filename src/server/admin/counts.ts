/**
 * Contagens da navegação do backoffice: só o trabalho por fazer.
 * Uma única ronda de queries leves por pedido (React cache), partilhada pelo
 * layout e por qualquer página que precise dos mesmos números.
 */
import { and, desc, isNull, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db/client";
import { sectors, syncRuns } from "@/db/schema";
import { type SyncHealth, syncHealth } from "@/lib/sync-health";
import { ORDER_STATUSES_TO_HANDLE } from "@/components/admin/status";
import { countMaterials, lastSuccessfulSync } from "@/server/catalog/materials";
import { countOrdersByStatus } from "@/server/orders/admin";

export type AdminCounts = {
  /** Encomendas em estados que esperam por alguém da oficina. */
  ordersToHandle: number;
  /** Artigos sem margem + artigos que deixaram de existir no ERP. */
  materialsAttention: number;
  /** Secções da oficina (ativas) sem margem. */
  sectorsWithoutMargin: number;
  sync: { level: SyncHealth["level"]; lastSuccessAt: Date | null };
};

export const getAdminCounts = cache(async (): Promise<AdminCounts> => {
  const [orderCounts, materials, lastSuccessAt, lastRun, sectorRows] = await Promise.all([
    countOrdersByStatus(),
    countMaterials(),
    lastSuccessfulSync(),
    db
      .select({ status: syncRuns.status })
      .from(syncRuns)
      .orderBy(desc(syncRuns.startedAt))
      .limit(1),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(sectors)
      .where(and(isNull(sectors.archivedAt), isNull(sectors.margin))),
  ]);
  const health = syncHealth({
    lastRunStatus: lastRun[0]?.status ?? null,
    lastSuccessAt,
    now: new Date(),
  });
  return {
    ordersToHandle: ORDER_STATUSES_TO_HANDLE.reduce(
      (total, status) => total + (orderCounts[status] ?? 0),
      0,
    ),
    materialsAttention: materials.noMargin + materials.missing,
    sectorsWithoutMargin: sectorRows[0]?.n ?? 0,
    sync: { level: health.level, lastSuccessAt },
  };
});
