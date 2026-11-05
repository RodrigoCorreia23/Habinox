import { describe, expect, it } from "vitest";
import { parseSettingInput, settingToInput } from "@/server/settings-form";
import { SETTING_SCHEMAS } from "@/server/settings";

describe("parseSettingInput", () => {
  it("IVA em percentagem → fração", () => {
    expect(parseSettingInput("vat_rate", "23")).toEqual({ ok: true, value: { rate: "0.2300" } });
    expect(parseSettingInput("vat_rate", " 6 % ")).toEqual({ ok: true, value: { rate: "0.0600" } });
    expect(parseSettingInput("vat_rate", "13,5")).toEqual({ ok: true, value: { rate: "0.1350" } });
    expect(parseSettingInput("vat_rate", "30")).toEqual({ ok: true, value: { rate: "0.3000" } });
    expect(parseSettingInput("vat_rate", "0")).toEqual({ ok: true, value: { rate: "0.0000" } });
  });

  it("recusa IVA acima de 30% ou mal escrito", () => {
    expect(parseSettingInput("vat_rate", "30,5")).toEqual({
      ok: false,
      message: "Escreva um número entre 0 e 30.",
    });
    expect(parseSettingInput("vat_rate", "100").ok).toBe(false);
    expect(parseSettingInput("vat_rate", "123").ok).toBe(false);
    expect(parseSettingInput("vat_rate", "0.23.1").ok).toBe(false);
    expect(parseSettingInput("vat_rate", "").ok).toBe(false);
  });

  it("validade dos orçamentos entre 1 e 365 dias", () => {
    expect(parseSettingInput("quote_validity_days", "30")).toEqual({
      ok: true,
      value: { days: 30 },
    });
    expect(parseSettingInput("quote_validity_days", "0").ok).toBe(false);
    expect(parseSettingInput("quote_validity_days", "366").ok).toBe(false);
    expect(parseSettingInput("quote_validity_days", "15,5").ok).toBe(false);
    expect(parseSettingInput("quote_validity_days", "").ok).toBe(false);
  });

  it("expiração das encomendas: vazio desliga", () => {
    expect(parseSettingInput("order_expiry_days", "")).toEqual({ ok: true, value: { days: null } });
    expect(parseSettingInput("order_expiry_days", "7")).toEqual({ ok: true, value: { days: 7 } });
    expect(parseSettingInput("order_expiry_days", "91").ok).toBe(false);
  });

  it("email de avisos", () => {
    expect(parseSettingInput("orders_notify_email", " Geral@Habinox.pt ")).toEqual({
      ok: true,
      value: { email: "geral@habinox.pt" },
    });
    expect(parseSettingInput("orders_notify_email", "geral@habinox").ok).toBe(false);
  });

  it("o que aceita passa no esquema guardado", () => {
    const cases = [
      ["vat_rate", "23"],
      ["quote_validity_days", "30"],
      ["order_expiry_days", ""],
      ["orders_notify_email", "geral@habinox.pt"],
    ] as const;
    for (const [key, raw] of cases) {
      const parsed = parseSettingInput(key, raw);
      if (!parsed.ok) throw new Error(key);
      expect(SETTING_SCHEMAS[key].safeParse(parsed.value).success, key).toBe(true);
    }
  });
});

describe("settingToInput", () => {
  it("mostra o valor como se escreve", () => {
    expect(settingToInput("vat_rate", { rate: "0.2300" })).toBe("23");
    expect(settingToInput("vat_rate", { rate: "0.1350" })).toBe("13,5");
    expect(settingToInput("order_expiry_days", { days: null })).toBe("");
    expect(settingToInput("quote_validity_days", { days: 30 })).toBe("30");
    expect(settingToInput("orders_notify_email", { email: "a@b.pt" })).toBe("a@b.pt");
  });
});
