import { describe, expect, it } from "vitest";
import type { ProductOptionDef } from "@/lib/options";
import { optionScopeNames, validateFormula } from "@/lib/pricing";

const options: ProductOptionDef[] = [
  { key: "largura", type: "dimension", var: "L", required: true },
  { key: "altura", type: "dimension", var: "H", required: true },
  { key: "iluminacao", type: "boolean", required: false },
  {
    key: "espacamento",
    type: "choice",
    required: true,
    values: [
      { key: "e10", params: { valor: 0.1 } },
      { key: "e12", params: { valor: 0.12 } },
    ],
  },
];

describe("optionScopeNames", () => {
  it("medidas, sim/não e parâmetros das escolhas", () => {
    expect([...optionScopeNames(options)].sort()).toEqual([
      "H",
      "L",
      "espacamento.valor",
      "iluminacao",
    ]);
  });
});

describe("validateFormula", () => {
  it("fórmula correta não tem problemas", () => {
    expect(
      validateFormula({
        options,
        variables: [
          { name: "barras", expr: "ceil(L / espacamento.valor)" },
          { name: "area", expr: "L × H" },
        ],
        lines: [{ quantityExpr: "barras × H" }, { quantityExpr: "2 + 1,5 × iluminacao" }],
      }),
    ).toEqual([]);
  });

  it("aponta cada problema à variável ou linha", () => {
    const issues = validateFormula({
      options,
      variables: [
        { name: "a", expr: "b + 1" },
        { name: "b", expr: "L * " },
        { name: "L", expr: "1" },
        { name: "a", expr: "2" },
      ],
      lines: [{ quantityExpr: "x × H" }, { quantityExpr: "min(1,2)" }],
    });
    expect(issues).toEqual([
      {
        where: { kind: "variable", index: 0 },
        message: '"b" está definida mais abaixo: mova-a para cima',
      },
      { where: { kind: "variable", index: 1 }, message: "Expressão incompleta" },
      { where: { kind: "variable", index: 2 }, message: '"L" já é o nome de uma opção' },
      { where: { kind: "variable", index: 3 }, message: '"a" está repetida' },
      { where: { kind: "line", index: 0 }, message: '"x" não existe neste produto' },
      {
        where: { kind: "line", index: 1 },
        message: "Número de argumentos errado em min (separe os argumentos com ;)",
      },
    ]);
  });
});
