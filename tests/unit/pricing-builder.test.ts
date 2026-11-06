import { describe, expect, it } from "vitest";
import {
  builderExpression,
  calculatePrice,
  describeQuantity,
  parseBuilderNumber,
} from "@/lib/pricing";
import { parseDecimal as money } from "@/lib/money";

describe("builderExpression", () => {
  it("uma vez", () => {
    expect(builderExpression({ basis: "one", factor: "1", fixed: "0" })).toBe("1");
    expect(builderExpression({ basis: "one", factor: "2", fixed: "0" })).toBe("2");
  });

  it("por m², metro e perímetro, com fator", () => {
    expect(builderExpression({ basis: "area", factor: "2", fixed: "0" })).toBe("2 * (L * H)");
    expect(builderExpression({ basis: "width", factor: "1", fixed: "0" })).toBe("(L)");
    expect(builderExpression({ basis: "perimeter", factor: "1.5", fixed: "0" })).toBe(
      "1,5 * (2 * (L + H))",
    );
  });

  it("fixo + variável, e só fixo", () => {
    expect(builderExpression({ basis: "area", factor: "2", fixed: "1" })).toBe("1 + 2 * (L * H)");
    expect(builderExpression({ basis: "area", factor: "0", fixed: "0.5" })).toBe("0,5");
  });
});

describe("describeQuantity", () => {
  it("frases para o Bruno", () => {
    expect(describeQuantity({ basis: "one", factor: "1", fixed: "0" }, "un.")).toBe("1 un.");
    expect(describeQuantity({ basis: "area", factor: "2", fixed: "0" }, "m²")).toBe("2 m² por m²");
    expect(describeQuantity({ basis: "area", factor: "2", fixed: "1" }, "h")).toBe(
      "1 h + 2 h por m²",
    );
  });
});

describe("parseBuilderNumber", () => {
  it("vírgula ou ponto; vazio dá o valor de omissão; resto recusa", () => {
    expect(parseBuilderNumber("2,5", "1")).toBe("2.5");
    expect(parseBuilderNumber("", "1")).toBe("1");
    expect(parseBuilderNumber("-1", "1")).toBeNull();
    expect(parseBuilderNumber("abc", "1")).toBeNull();
  });
});

describe("contas do motor com o construtor", () => {
  it("chapa 2 × m² num portão de 3 × 1,5 m", () => {
    const result = calculatePrice({
      options: [
        {
          key: "largura",
          type: "dimension",
          var: "L",
          required: true,
          min: 1000,
          max: 6000,
          step: 10,
        },
        {
          key: "altura",
          type: "dimension",
          var: "H",
          required: true,
          min: 800,
          max: 2200,
          step: 10,
        },
      ],
      values: { largura: 3000, altura: 1500 },
      lines: [
        {
          label: "Chapa",
          kind: "material",
          quantityExpr: builderExpression({ basis: "area", factor: "2", fixed: "0" }),
          unit: "m²",
          item: { code: "CH", name: "Chapa", unitCost: money("10"), margin: money("0.5") },
        },
      ],
      consumablesRate: money("0"),
    });
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    // 2 × 4,5 m² = 9 m² × 10 € = 90 € × 1,5 = 135 €
    expect(result.netCents).toBe(13500);
  });
});
