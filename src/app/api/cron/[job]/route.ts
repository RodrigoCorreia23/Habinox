import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { env } from "@/env";
import { log } from "@/lib/log";
import { isAuthorizedCronRequest } from "@/server/jobs/cron-auth";
import { getJob } from "@/server/jobs/registry";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/cron/[job]">) {
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), env.CRON_SECRET)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { job: name } = await ctx.params;
  const job = getJob(name);
  if (!job) {
    return Response.json({ error: "unknown_job" }, { status: 404 });
  }

  const jobId = randomUUID();
  const jobLog = log.child({ job: name, jobId });
  const startedAt = Date.now();
  jobLog.info("job.start");

  try {
    const result = await job({ jobId, log: jobLog });
    jobLog.info("job.finish", { durationMs: Date.now() - startedAt, ...result });
    return Response.json({ ok: true, jobId, ...result });
  } catch (error) {
    jobLog.error("job.failed", { durationMs: Date.now() - startedAt, error });
    return Response.json({ ok: false, jobId }, { status: 500 });
  }
}
