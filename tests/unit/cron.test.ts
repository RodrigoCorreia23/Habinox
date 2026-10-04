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
