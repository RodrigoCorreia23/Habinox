import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isAuthorizedCronRequest } from "@/server/jobs/cron-auth";
import { getJob } from "@/server/jobs/registry";

const secret = "s".repeat(64);

describe("isAuthorizedCronRequest", () => {
  it("aceita o Bearer com o segredo correto", () => {
    expect(isAuthorizedCronRequest(`Bearer ${secret}`, secret)).toBe(true);
  });

  it("rejeita header ausente", () => {
    expect(isAuthorizedCronRequest(null, secret)).toBe(false);
  });

  it("rejeita segredo errado com o mesmo comprimento", () => {
    expect(isAuthorizedCronRequest(`Bearer ${"x".repeat(64)}`, secret)).toBe(false);
  });

  it("rejeita segredo sem prefixo Bearer", () => {
    expect(isAuthorizedCronRequest(secret, secret)).toBe(false);
  });
});

describe("getJob", () => {
  it("devolve jobs registados", () => {
    expect(getJob("health")).toBeTypeOf("function");
  });

  it("não devolve propriedades herdadas do protótipo", () => {
    expect(getJob("toString")).toBeUndefined();
    expect(getJob("__proto__")).toBeUndefined();
  });
});

describe("vercel.json", () => {
  const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
    crons: { path: string; schedule: string }[];
  };

  it("cada cron aponta para um job registado", () => {
    for (const cron of config.crons) {
      const name = cron.path.replace(/^\/api\/cron\//, "");
      expect(getJob(name), cron.path).toBeTypeOf("function");
    }
  });

  it("agenda a sincronização do ERP, a expiração, a limpeza e as traduções", () => {
    expect(config.crons.map((cron) => cron.path).sort()).toEqual([
      "/api/cron/cleanup",
      "/api/cron/expire-orders",
      "/api/cron/odoo-sync",
      "/api/cron/translations",
    ]);
  });
});
