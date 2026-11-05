import { db } from "@/db/client";
import type { Logger } from "@/lib/log";
import { deleteExpiredRateLimits } from "@/server/rate-limit";
import { getErpClient, syncErpMaterials } from "@/server/sync/odoo";

export interface JobContext {
  jobId: string;
  log: Logger;
}

export interface JobResult {
  items?: number;
  details?: Record<string, unknown>;
}

export type Job = (ctx: JobContext) => Promise<JobResult>;

/**
 * Jobs agendados, chamados via /api/cron/<nome>.
 * Regra: todos idempotentes — correr duas vezes não pode duplicar nada.
 */
export const jobs = {
  // Verifica apenas que o mecanismo de cron funciona.
  health: async () => ({}),
  // Cópia local dos artigos e custos do Odoo, uma vez por dia.
  "odoo-sync": async ({ log }) => {
    const summary = await syncErpMaterials(db, getErpClient(), log);
    if (summary.status === "failed") throw new Error("Sincronização do ERP falhou");
    return { items: summary.inserted + summary.updated + summary.missing, details: { ...summary } };
  },
  // Arrumação diária: apaga o que já não serve (contagens do limite de pedidos).
  cleanup: async () => ({ items: await deleteExpiredRateLimits() }),
} satisfies Record<string, Job>;

export type JobName = keyof typeof jobs;

export function getJob(name: string): Job | undefined {
  return Object.hasOwn(jobs, name) ? jobs[name as JobName] : undefined;
}
