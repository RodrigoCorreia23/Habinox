import { describe, expect, it } from "vitest";
import {
  add,
  decimalFromCents,
  decimalFromNumber,
  formatDecimal,
  formatEuros,
  mul,
  ONE,
  parseDecimal,
  sum,
  sumCents,
  toCents,
  vatCents,
} from "@/lib/money";

describe("parseDecimal", () => {
  it.each([
    ["12.4000", "12.40000000"],
    ["0.23", "0.23000000"],
    ["-3", "-3.00000000"],
    ["0.00000001", "0.00000001"],
  ])("lê %s", (input, expected) => {
    expect(formatDecimal(parseDecimal(input))).toBe(expected);
  });

  it.each(["", "abc", "1,5", "1.", ".5", "1e3", "0.000000001"])("recusa %j", (input) => {
    expect(() => parseDecimal(input)).toThrow();
  });
});

describe("decimalFromNumber", () => {
  it("absorve o erro de float das expressões", () => {
    // 0.1 + 0.2 = 0.30000000000000004 em float
    expect(formatDecimal(decimalFromNumber(0.1 + 0.2))).toBe("0.30000000");
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 1e12])("recusa %s", (value) => {
    expect(() => decimalFromNumber(value)).toThrow();
  });
});

describe("contas", () => {
  it("custo × quantidade sem perder precisão", () => {
    // 11,2 m de tubo a 12,4000 €/m = 138,88 €
    const total = mul(parseDecimal("12.4000"), decimalFromNumber(11.2));
    expect(toCents(total)).toBe(13888);
  });

  it("margem sobre o custo: 100 € com 5% = 105 €", () => {
    const cost = parseDecimal("100");
    const margin = parseDecimal("0.05");
    expect(toCents(mul(cost, add(ONE, margin)))).toBe(10500);
  });

  it("soma", () => {
    expect(toCents(sum([parseDecimal("0.10"), parseDecimal("0.20")]))).toBe(30);
  });
});

describe("toCents", () => {
  it.each([
    ["1.005", 101],
    ["1.004999", 100],
    ["-1.005", -101],
    ["0.005", 1],
    ["2786.43", 278643],
  ])("arredonda %s a %i cêntimos", (input, expected) => {
    expect(toCents(parseDecimal(input))).toBe(expected);
  });

  it("ida e volta pelos cêntimos", () => {
    expect(toCents(decimalFromCents(278643))).toBe(278643);
  });
});

describe("IVA", () => {
  it("23% de 2 265,39 € = 521,04 €", () => {
    expect(vatCents(226539, parseDecimal("0.23"))).toBe(52104);
  });

  it("arredonda ao cêntimo, metade para cima", () => {
    // 0,50 € × 23% = 0,115 € → 0,12 €
    expect(vatCents(50, parseDecimal("0.23"))).toBe(12);
  });

  it("recusa cêntimos não inteiros", () => {
    expect(() => vatCents(10.5, parseDecimal("0.23"))).toThrow();
  });
});

describe("sumCents e formatEuros", () => {
  it("soma cêntimos", () => {
    expect(sumCents([100, 250, 1])).toBe(351);
  });

  it("formata em pt-PT com separador de milhares", () => {
    const text = formatEuros(278643).replace(/\s/g, " ");
    expect(text).toBe("2 786,43 €");
  });
});
