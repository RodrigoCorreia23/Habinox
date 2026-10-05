import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/env";

const validSecret = "a".repeat(32);
const base = {
  CRON_SECRET: validSecret,
  DATABASE_URL: "postgres://u:p@localhost:5432/db",
  BETTER_AUTH_SECRET: "b".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
};

describe("parseServerEnv", () => {
  it("aceita um ambiente válido e aplica defaults", () => {
    const env = parseServerEnv(base);
    expect(env.NODE_ENV).toBe("development");
    expect(env.NEXT_PUBLIC_APP_ENV).toBe("development");
  });

  it("falha se faltar CRON_SECRET", () => {
    expect(() => parseServerEnv({ ...base, CRON_SECRET: undefined })).toThrow(/CRON_SECRET/);
  });

  it("falha se CRON_SECRET for curto demais", () => {
    expect(() => parseServerEnv({ ...base, CRON_SECRET: "curto" })).toThrow(/CRON_SECRET/);
  });

  it("rejeita um ambiente lógico desconhecido", () => {
    expect(() => parseServerEnv({ ...base, NEXT_PUBLIC_APP_ENV: "qa" })).toThrow(
      /NEXT_PUBLIC_APP_ENV/,
    );
  });

  it("exige RESEND_API_KEY fora de development", () => {
    expect(() => parseServerEnv({ ...base, NEXT_PUBLIC_APP_ENV: "staging" })).toThrow(
      /RESEND_API_KEY/,
    );
  });

  it("exige EMAIL_FROM quando há RESEND_API_KEY", () => {
    expect(() => parseServerEnv({ ...base, RESEND_API_KEY: "re_x" })).toThrow(/EMAIL_FROM/);
  });
});
