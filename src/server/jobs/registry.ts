import { db } from "@/db/client";
import type { Logger } from "@/lib/log";
import { translatePending } from "@/server/catalog/translations";
import { expireStaleOrders } from "@/server/orders/expire";
import { deleteExpiredRateLimits } from "@/server/rate-limit";
import { deleteStaleCarts } from "@/server/store/cart";
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
  // Arrumação diária: carrinhos abandonados e contagens do limite de pedidos.
  cleanup: async () => {
    const carts = await deleteStaleCarts();
    const rateLimits = await deleteExpiredRateLimits();
    return { items: carts + rateLimits, details: { carts, rateLimits } };
  },
  // Encomendas por pagar há mais de `settings.order_expiry_days` (desligado por omissão).
  "expire-orders": async ({ log }) => {
    const result = await expireStaleOrders(log);
    return { items: result.expired, details: result };
  },
  // Rede de segurança da tradução automática do catálogo (normalmente corre ao guardar).
  translations: async ({ log }) => {
    const summary = await translatePending(log);
    if (summary.failed > 0) throw new Error(`${summary.failed} traduções falharam`);
    return { items: summary.translated, details: { ...summary } };
  },
} satisfies Record<string, Job>;

export type JobName = keyof typeof jobs;

export function getJob(name: string): Job | undefined {
  return Object.hasOwn(jobs, name) ? jobs[name as JobName] : undefined;
}
