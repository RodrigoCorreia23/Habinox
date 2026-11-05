import { describe, expect, it } from "vitest";
import { intlLocale, parseEnabledLocales } from "@/i18n/locales";

describe("parseEnabledLocales", () => {
  it("sem variável, só português", () => {
    expect(parseEnabledLocales(undefined)).toEqual(["pt"]);
    expect(parseEnabledLocales("")).toEqual(["pt"]);
  });

  it("mantém a ordem fixa, PT primeiro, e ignora o que não conhece", () => {
    expect(parseEnabledLocales(" ES, en ,xx,pt")).toEqual(["pt", "en", "es"]);
    expect(parseEnabledLocales("pt,en,de,fr,it,es,nl")).toHaveLength(7);
  });
});

describe("intlLocale", () => {
  it("português de Portugal e inglês britânico", () => {
    expect(intlLocale("pt")).toBe("pt-PT");
    expect(intlLocale("en")).toBe("en-GB");
    expect(intlLocale("??")).toBe("pt-PT");
  });
});
