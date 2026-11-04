import { describe, expect, it } from "vitest";
import { formatParams, KEY_PATTERN, keyFromName, parseParams } from "@/lib/options";

describe("keyFromName", () => {
  it.each([
    ["Motorização", "motorizacao"],
    ["Cor RAL", "cor_ral"],
    ["Espaçamento das barras", "espacamento_das_barras"],
    ["2 folhas", "v_2_folhas"],
    ["Inox 304", "inox_304"],
    ["!!", ""],
  ])("%j → %j", (name, key) => {
    expect(keyFromName(name)).toBe(key);
    if (key) expect(KEY_PATTERN.test(key)).toBe(true);
  });
});

describe("parseParams", () => {
  it("lê nome=número com vírgula ou ponto, separados por ; ou linha", () => {
    expect(parseParams("valor=0,12; lados = 2\nlargura=0.30")).toEqual({
      ok: true,
      params: { valor: 0.12, lados: 2, largura: 0.3 },
    });
    expect(parseParams("  ")).toEqual({ ok: true, params: {} });
  });

  it.each(["valor", "valor=abc", "Valor=1", "valor=1; valor=2", "1x=2"])("recusa %j", (text) => {
    expect(parseParams(text).ok).toBe(false);
  });

  it("formata para o campo e volta a ler igual", () => {
    const params = { valor: 0.12, lados: 2 };
    expect(formatParams(params)).toBe("valor=0,12; lados=2");
    expect(parseParams(formatParams(params))).toEqual({ ok: true, params });
  });
});
