import { describe, expect, it } from "vitest";
import { costToInput, parseCostInput } from "@/lib/money";

describe("parseCostInput", () => {
  it("aceita vírgula ou ponto, até 4 casas, e o símbolo do euro", () => {
    expect(parseCostInput("12,4")).toEqual({ ok: true, value: "12.4000" });
    expect(parseCostInput("0,0350 €")).toEqual({ ok: true, value: "0.0350" });
    expect(parseCostInput(" 1 290 ")).toEqual({ ok: true, value: "1290.0000" });
    expect(parseCostInput("5.5")).toEqual({ ok: true, value: "5.5000" });
  });

  it("recusa o resto", () => {
    expect(parseCostInput("12,34567").ok).toBe(false);
    expect(parseCostInput("-3").ok).toBe(false);
    expect(parseCostInput("abc").ok).toBe(false);
    expect(parseCostInput("").ok).toBe(false);
  });
});

describe("costToInput", () => {
  it("mostra como se escreve", () => {
    expect(costToInput("12.4000")).toBe("12,40");
    expect(costToInput("0.0350")).toBe("0,035");
    expect(costToInput("3.0000")).toBe("3,00");
    expect(parseCostInput(costToInput("0.0350"))).toEqual({ ok: true, value: "0.0350" });
  });
});
