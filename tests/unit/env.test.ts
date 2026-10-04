import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/env";

const validSecret = "a".repeat(32);

describe("parseServerEnv", () => {
  it("aceita um ambiente válido e aplica defaults", () => {
    const env = parseServerEnv({ CRON_SECRET: validSecret });
    expect(env.NODE_ENV).toBe("development");
    expect(env.NEXT_PUBLIC_APP_ENV).toBe("development");
  });

  it("falha se faltar CRON_SECRET", () => {
    expect(() => parseServerEnv({})).toThrow(/CRON_SECRET/);
  });

  it("falha se CRON_SECRET for curto demais", () => {
    expect(() => parseServerEnv({ CRON_SECRET: "curto" })).toThrow(/CRON_SECRET/);
  });

  it("rejeita um ambiente lógico desconhecido", () => {
    expect(() => parseServerEnv({ CRON_SECRET: validSecret, NEXT_PUBLIC_APP_ENV: "qa" })).toThrow(
      /NEXT_PUBLIC_APP_ENV/,
    );
  });
});
