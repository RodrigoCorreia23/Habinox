import { describe, expect, it } from "vitest";
import { parseDecimal as d } from "@/lib/money";
import { applicableLibraryRules, ruleOptionKeys, type Rule } from "@/lib/options";
import { type PricedItem, withLineMargin } from "@/lib/pricing";

const tube: PricedItem = { code: "T", name: "Tubo", unitCost: d("10"), margin: d("0.3") };

describe("withLineMargin", () => {
  it("construtor: manda a margem da linha, mesmo vazia", () => {
    expect(withLineMargin(tube, d("0.5"), true).margin).toBe(d("0.5"));
    expect(withLineMargin(tube, null, true).margin).toBeNull();
  });

  it("fórmula avançada: a da linha se existir, senão a do artigo", () => {
    expect(withLineMargin(tube, null, false)).toBe(tube);
    expect(withLineMargin(tube, d("0.2"), false).margin).toBe(d("0.2"));
  });
});

describe("regras da biblioteca", () => {
  const rule: Rule = {
    conditions: [{ option: "material", op: "eq", value: "inox" }],
    effect: { type: "hide", option: "cor" },
  };

  it("lê as opções das condições, comparações e efeito", () => {
    const compare: Rule = {
      conditions: [{ option: "altura", op: "gt", value: { option: "largura", factor: 1 } }],
      effect: { type: "forbid" },
    };
    expect(ruleOptionKeys(compare).sort()).toEqual(["altura", "largura"]);
    expect(ruleOptionKeys(rule).sort()).toEqual(["cor", "material"]);
  });

  it("só se aplica quando todas as opções da regra são da biblioteca no produto", () => {
    expect(applicableLibraryRules([rule], new Set(["material", "cor"]))).toHaveLength(1);
    // «cor» deste produto é uma divisão própria: a regra partilhada não lhe toca
    expect(applicableLibraryRules([rule], new Set(["material"]))).toHaveLength(0);
  });
});
