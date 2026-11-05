import { describe, expect, it } from "vitest";
import { measureFormat, normalizeNumberInput } from "@/lib/number-input";

describe("normalizeNumberInput", () => {
  it("português e restantes: vírgula decimal, ponto também aceite", () => {
    expect(normalizeNumberInput(" 2,5 ", "pt")).toBe("2.5");
    expect(normalizeNumberInput("2.5", "de")).toBe("2.5");
    expect(normalizeNumberInput("1 200", "fr")).toBe("1200");
  });

  it("inglês: ponto decimal, vírgula de milhares", () => {
    expect(normalizeNumberInput("1,200.5", "en")).toBe("1200.5");
    expect(normalizeNumberInput("2.5", "en")).toBe("2.5");
  });
});

describe("measureFormat", () => {
  it("sem milhares, com o separador decimal da língua, e volta a ler-se igual", () => {
    expect(measureFormat("pt-PT").format(1200.5)).toBe("1200,5");
    expect(measureFormat("en-GB").format(1200.5)).toBe("1200.5");
    expect(measureFormat("de-DE").format(1200.5)).toBe("1200,5");
    for (const [intl, app] of [
      ["pt-PT", "pt"],
      ["en-GB", "en"],
      ["de-DE", "de"],
      ["nl-NL", "nl"],
    ] as const) {
      expect(Number(normalizeNumberInput(measureFormat(intl).format(1234.25), app))).toBe(1234.25);
    }
  });
});
