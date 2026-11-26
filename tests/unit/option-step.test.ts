import { describe, expect, it } from "vitest";
import { lastReachable, nearestSteps, resolveConfig, type ProductOptionDef } from "@/lib/options";

const altura = (min: number | null, max: number | null, step: number | null): ProductOptionDef => ({
  key: "altura",
  type: "dimension",
  var: "H",
  required: true,
  ...(min !== null && { min }),
  ...(max !== null && { max }),
  ...(step !== null && { step }),
});

const accepted = (option: ProductOptionDef, value: number) =>
  resolveConfig([option], [], { [option.key]: value }).errors.length === 0;

describe("lastReachable", () => {
  it("deteta o máximo fora do passo (caso real: mínimo 5, passo 10, máximo 1000)", () => {
    expect(lastReachable({ min: 5, max: 1000, step: 10 })).toBe(995);
  });

  it("devolve null quando o máximo cai no passo", () => {
    expect(lastReachable({ min: 10, max: 1000, step: 10 })).toBeNull();
    expect(lastReachable({ min: 5, max: 995, step: 10 })).toBeNull();
    expect(lastReachable({ min: 5, max: 1000, step: 5 })).toBeNull();
  });

  it("sem mínimo conta a partir de 0", () => {
    expect(lastReachable({ min: null, max: 1000, step: 30 })).toBe(990);
    expect(lastReachable({ min: null, max: 1000, step: 10 })).toBeNull();
  });

  it("ignora opções sem passo ou sem máximo", () => {
    expect(lastReachable({ min: 5, max: 1000, step: null })).toBeNull();
    expect(lastReachable({ min: 5, max: 1000, step: 0 })).toBeNull();
    expect(lastReachable({ min: 5, max: null, step: 10 })).toBeNull();
  });

  it("não se engana com decimais", () => {
    expect(lastReachable({ min: 0, max: 0.3, step: 0.1 })).toBeNull();
    expect(lastReachable({ min: 0, max: 1, step: 0.3 })).toBe(0.9);
  });

  it("concorda com o resolveConfig: o valor devolvido é aceite e o máximo não", () => {
    const option = altura(5, 1000, 10);
    expect(accepted(option, 995)).toBe(true);
    expect(accepted(option, 1000)).toBe(false);
  });
});

describe("nearestSteps", () => {
  it("dá os dois vizinhos aceites", () => {
    expect(nearestSteps({ min: 5, max: 2000, step: 10 }, 1000)).toEqual({
      below: 995,
      above: 1005,
    });
  });

  it("corta o vizinho que sai dos limites", () => {
    expect(nearestSteps({ min: 5, max: 1000, step: 10 }, 1000)).toEqual({
      below: 995,
      above: null,
    });
    expect(nearestSteps({ min: 100, max: 1000, step: 10 }, 95)).toEqual({
      below: null,
      above: 100,
    });
  });

  it("sem passo não sugere nada", () => {
    expect(nearestSteps({ min: 5, max: 1000, step: null }, 7)).toEqual({
      below: null,
      above: null,
    });
  });

  it("os valores sugeridos são aceites pelo resolveConfig", () => {
    const option = altura(5, 2000, 10);
    for (const value of [6, 999, 1000, 1999]) {
      const { below, above } = nearestSteps({ min: 5, max: 2000, step: 10 }, value);
      if (below !== null) expect(accepted(option, below)).toBe(true);
      if (above !== null) expect(accepted(option, above)).toBe(true);
    }
  });
});
