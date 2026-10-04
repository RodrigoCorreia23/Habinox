import type { Logger } from "@/lib/log";

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
} satisfies Record<string, Job>;

export type JobName = keyof typeof jobs;

export function getJob(name: string): Job | undefined {
  return Object.hasOwn(jobs, name) ? jobs[name as JobName] : undefined;
}
