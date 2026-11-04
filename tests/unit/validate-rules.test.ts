import { describe, expect, it } from "vitest";
import { type ProductOptionDef, type Rule, validateRules } from "@/lib/options";

const options: ProductOptionDef[] = [
  { key: "largura", type: "dimension", required: true },
  { key: "altura", type: "dimension", required: true },
  { key: "material", type: "choice", required: true, values: [{ key: "ferro" }, { key: "inox" }] },
  {
    key: "acabamento",
    type: "choice",
    required: true,
    values: [{ key: "lacado" }, { key: "escovado" }],
  },
];

const rule = (partial: Partial<Rule> & Pick<Rule, "effect">): Rule => ({
  conditions: [{ option: "material", op: "eq", value: "inox" }],
  ...partial,
});

describe("validateRules", () => {
  it("aceita regras que dependem de opções acima", () => {
    expect(
      validateRules(options, [
        rule({ effect: { type: "restrict", option: "acabamento", values: ["escovado"] } }),
        rule({
          conditions: [{ option: "altura", op: "gt", value: { option: "largura", factor: 1 } }],
          effect: { type: "forbid" },
        }),
      ]),
    ).toEqual([]);
  });

  it("recusa regras que dependem de opções abaixo ou da própria", () => {
    expect(
      validateRules(options, [
        rule({ effect: { type: "hide", option: "largura" } }),
        rule({
          conditions: [{ option: "material", op: "eq", value: "ferro" }],
          effect: { type: "require", option: "material" },
        }),
      ]).map((issue) => issue.index),
    ).toEqual([0, 1]);
  });

  it("restrict sem nenhum valor permitido que sobre", () => {
    const issues = validateRules(options, [
      rule({ effect: { type: "restrict", option: "acabamento", values: ["polido"] } }),
    ]);
    expect(issues[0]?.message).toContain("Nenhum dos valores");
  });

  it("opções que o produto não tem: erro no produto, ignorado na biblioteca", () => {
    const rules = [rule({ effect: { type: "hide", option: "cor" } })];
    expect(validateRules(options, rules)).toHaveLength(1);
    expect(validateRules(options, rules, { library: true })).toEqual([]);
  });
});
