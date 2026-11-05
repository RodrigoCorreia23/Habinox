import { describe, expect, it } from "vitest";
import {
  planTranslations,
  type PlanRow,
  type PlanState,
  sourceHash,
  translationStatus,
} from "@/lib/translation-plan";

const row = (values: Record<string, string | null>, pt = "Portões"): PlanRow => ({
  field: "category.name",
  id: "c1",
  pt,
  values,
});
const state = (locale: string, origin: "auto" | "manual", pt = "Portões"): PlanState => ({
  field: "category.name",
  rowId: "c1",
  locale,
  sourceHash: sourceHash(pt),
  origin,
});

describe("planTranslations", () => {
  it("traduz o que falta", () => {
    const plan = planTranslations([row({ en: null, de: null })], [], ["en", "de"]);
    expect(plan.translate).toEqual([
      { field: "category.name", id: "c1", pt: "Portões", locales: ["en", "de"] },
    ]);
  });

  it("não refaz uma automática do mesmo português", () => {
    const plan = planTranslations([row({ en: "Gates" })], [state("en", "auto")], ["en"]);
    expect(plan.translate).toEqual([]);
  });

  it("refaz a automática quando o português muda", () => {
    const plan = planTranslations(
      [row({ en: "Gates" }, "Portões de correr")],
      [state("en", "auto", "Portões")],
      ["en"],
    );
    expect(plan.translate[0]?.locales).toEqual(["en"]);
  });

  it("nunca toca numa revista, mesmo com o português mudado", () => {
    const plan = planTranslations(
      [row({ en: "Gates" }, "Portões de correr")],
      [state("en", "manual", "Portões")],
      ["en"],
    );
    expect(plan.translate).toEqual([]);
  });

  it("uma tradução antiga sem estado passa a revista", () => {
    const plan = planTranslations([row({ en: "Gates" })], [], ["en"]);
    expect(plan.translate).toEqual([]);
    expect(plan.adopt).toEqual([
      { field: "category.name", id: "c1", locale: "en", hash: sourceHash("Portões") },
    ]);
  });

  it("ignora textos vazios", () => {
    expect(planTranslations([row({ en: null }, "  ")], [], ["en"]).translate).toEqual([]);
  });
});

describe("translationStatus", () => {
  it("distingue em falta, automática, revista e a rever", () => {
    expect(translationStatus("Portões", null, undefined)).toBe("missing");
    expect(translationStatus("Portões", "Gates", state("en", "auto"))).toBe("auto");
    expect(translationStatus("Portões", "Gates", state("en", "manual"))).toBe("manual");
    expect(translationStatus("Portões de correr", "Gates", state("en", "manual"))).toBe("stale");
    expect(translationStatus("Portões de correr", "Gates", state("en", "auto"))).toBe("stale");
    expect(translationStatus("Portões", "Gates", undefined)).toBe("manual");
  });
});
