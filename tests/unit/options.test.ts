import { describe, expect, it } from "vitest";
import { resolveConfig, ruleSchema, type ProductOptionDef, type Rule } from "@/lib/options";

const gate: ProductOptionDef[] = [
  { key: "largura", type: "dimension", var: "L", required: true, min: 1000, max: 6000, step: 10 },
  {
    key: "material",
    type: "choice",
    required: true,
    values: [{ key: "ferro" }, { key: "inox" }, { key: "aluminio" }],
  },
  {
    key: "acabamento",
    type: "choice",
    required: true,
    values: [{ key: "lacado" }, { key: "galvanizado" }, { key: "escovado" }, { key: "polido" }],
  },
  {
    key: "cor",
    type: "choice",
    required: true,
    values: [{ key: "ral_7016" }, { key: "ral_9005" }],
  },
  { key: "motorizacao", type: "choice", required: false, values: [{ key: "motor" }] },
  { key: "iluminacao", type: "boolean", required: false },
];

const rules: Rule[] = [
  {
    conditions: [{ option: "material", op: "eq", value: "inox" }],
    effect: { type: "restrict", option: "acabamento", values: ["escovado", "polido"] },
  },
  {
    conditions: [{ option: "acabamento", op: "ne", value: "lacado" }],
    effect: { type: "hide", option: "cor" },
  },
  {
    conditions: [{ option: "largura", op: "gt", value: 4000 }],
    effect: { type: "require", option: "motorizacao" },
  },
];

const base = { largura: 3000, material: "ferro", acabamento: "lacado", cor: "ral_7016" };

describe("resolveConfig", () => {
  it("aceita uma configuração válida", () => {
    const result = resolveConfig(gate, rules, base);
    expect(result.errors).toEqual([]);
    expect(result.values).toEqual({ ...base, iluminacao: false });
  });

  it("restrict: inox só escovado ou polido", () => {
    const result = resolveConfig(gate, rules, { ...base, material: "inox" });
    expect(result.state.acabamento?.allowed).toEqual(["escovado", "polido"]);
    expect(result.errors).toEqual([
      { option: "acabamento", code: "not_allowed", message: "Valor não disponível" },
    ]);
  });

  it("hide: sem lacado, a cor desaparece e o valor enviado é ignorado", () => {
    const result = resolveConfig(gate, rules, { ...base, material: "inox", acabamento: "polido" });
    expect(result.errors).toEqual([]);
    expect(result.state.cor?.visible).toBe(false);
    expect(result.values.cor).toBeUndefined();
  });

  it("require: acima de 4 000 mm a motorização é obrigatória", () => {
    expect(resolveConfig(gate, rules, base).state.motorizacao?.required).toBe(false);
    const wide = resolveConfig(gate, rules, { ...base, largura: 5000 });
    expect(wide.errors).toEqual([
      { option: "motorizacao", code: "required", message: "Obrigatório" },
    ]);
  });

  it.each([
    [{ largura: 900 }, "out_of_range"],
    [{ largura: 6010 }, "out_of_range"],
    [{ largura: 3005 }, "step"],
    [{ largura: 3000.5 }, "invalid_type"],
    [{ largura: "3000" }, "invalid_type"],
    [{ material: "madeira" }, "not_allowed"],
    [{ iluminacao: "sim" }, "invalid_type"],
    [{ largura: undefined }, "required"],
  ])("recusa %j (%s)", (change, code) => {
    const result = resolveConfig(gate, rules, { ...base, ...change });
    expect(result.errors.map((error) => error.code)).toEqual([code]);
  });

  it("forbid compara duas medidas", () => {
    const stair: ProductOptionDef[] = [
      { key: "altura_pisos", type: "dimension", var: "H", required: true },
      { key: "projecao", type: "dimension", var: "P", required: true },
    ];
    const forbid: Rule = ruleSchema.parse({
      conditions: [
        { option: "projecao", op: "lt", value: { option: "altura_pisos", factor: 0.8 } },
      ],
      effect: { type: "forbid" },
      message: "A escada fica demasiado inclinada; contacte-nos",
    });
    expect(resolveConfig(stair, [forbid], { altura_pisos: 2800, projecao: 2300 }).errors).toEqual(
      [],
    );
    expect(resolveConfig(stair, [forbid], { altura_pisos: 2800, projecao: 2000 }).errors).toEqual([
      { code: "forbidden", message: "A escada fica demasiado inclinada; contacte-nos" },
    ]);
  });

  it("condição sobre opção sem valor é falsa", () => {
    const hideAll: Rule = {
      conditions: [{ option: "motorizacao", op: "ne", value: "motor" }],
      effect: { type: "hide", option: "iluminacao" },
    };
    const result = resolveConfig(gate, [hideAll], base);
    expect(result.state.iluminacao?.visible).toBe(true);
  });
});

describe("ruleSchema", () => {
  it("recusa chaves com maiúsculas ou espaços e efeitos desconhecidos", () => {
    expect(
      ruleSchema.safeParse({
        conditions: [{ option: "Material", op: "eq", value: "inox" }],
        effect: { type: "forbid" },
      }).success,
    ).toBe(false);
    expect(
      ruleSchema.safeParse({
        conditions: [{ option: "material", op: "eq", value: "inox" }],
        effect: { type: "delete" },
      }).success,
    ).toBe(false);
  });
});
