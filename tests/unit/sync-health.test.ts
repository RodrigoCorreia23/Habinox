import { describe, expect, it } from "vitest";
import { syncHealth } from "@/lib/sync-health";

const now = new Date("2026-11-05T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

describe("syncHealth", () => {
  it("sem nenhuma sincronização", () => {
    expect(syncHealth({ lastRunStatus: null, lastSuccessAt: null, now }).level).toBe("warn");
    expect(syncHealth({ lastRunStatus: "failed", lastSuccessAt: null, now }).level).toBe(
      "critical",
    );
  });

  it("recente e bem sucedida", () => {
    expect(syncHealth({ lastRunStatus: "succeeded", lastSuccessAt: hoursAgo(3), now })).toEqual({
      level: "ok",
      message: "Custos do ERP atualizados.",
    });
  });

  it("falhou hoje mas ontem correu bem: aviso", () => {
    expect(syncHealth({ lastRunStatus: "failed", lastSuccessAt: hoursAgo(25), now }).level).toBe(
      "warn",
    );
  });

  it("36 h ou mais sem sucesso: crítico, com as horas", () => {
    const health = syncHealth({ lastRunStatus: "failed", lastSuccessAt: hoursAgo(40), now });
    expect(health.level).toBe("critical");
    expect(health.message).toContain("40 h");
    expect(syncHealth({ lastRunStatus: "succeeded", lastSuccessAt: hoursAgo(36), now }).level).toBe(
      "critical",
    );
  });

  it("parcial: aviso", () => {
    expect(syncHealth({ lastRunStatus: "partial", lastSuccessAt: hoursAgo(1), now }).level).toBe(
      "warn",
    );
  });
});
