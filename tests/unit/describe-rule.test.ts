import { describe, expect, it } from "vitest";
import type { OptionInfo } from "@/components/admin/conditions-editor";
import { describeRule } from "@/components/admin/describe-rule";

const options: OptionInfo[] = [
  { key: "largura", name: "Largura", type: "dimension", unit: null, values: [] },
  { key: "altura", name: "Altura", type: "dimension", unit: null, values: [] },
  {
    key: "material",
    name: "Material",
    type: "choice",
    unit: null,
    values: [
      { key: "inox", label: "Inox" },
      { key: "ferro", label: "Ferro" },
    ],
  },
  {
    key: "acabamento",
    name: "Acabamento",
    type: "choice",
    unit: null,
    values: [
      { key: "escovado", label: "Escovado" },
      { key: "polido", label: "Polido" },
      { key: "lacado", label: "Lacado" },
    ],
  },
  { key: "motor", name: "Motorizado", type: "boolean", unit: null, values: [] },
];

// O Intl separa os milhares com um espaço que não quebra; compara-se com espaços normais.
const plain = (text: string) => text.replace(/[\u00a0\u202f]/g, " ");

describe("describeRule", () => {
  it("escreve a frase sem símbolos e omite «× 1»", () => {
    expect(
      describeRule(
        {
          conditions: [{ option: "altura", op: "gt", value: { option: "largura", factor: 1 } }],
          effect: { type: "forbid" },
          message: "O portão não pode ser mais alto do que largo.",
        },
        options,
      ),
    ).toBe(
      "Se Altura for maior que Largura, então não é possível («O portão não pode ser mais alto do que largo.»)",
    );
  });

  it("diz o fator por extenso quando não é 1", () => {
    expect(
      describeRule(
        {
          conditions: [{ option: "altura", op: "lte", value: { option: "largura", factor: 1.5 } }],
          effect: { type: "hide", option: "motor" },
          message: "",
        },
        options,
      ),
    ).toBe("Se Altura for até 1,5 vezes Largura, então esconde Motorizado");
  });

  it("valores de escolha, números com unidade e efeito «só pode ser»", () => {
    expect(
      plain(
        describeRule(
          {
            conditions: [
              { option: "material", op: "in", values: ["inox"] },
              { option: "largura", op: "gte", value: 3000 },
            ],
            effect: { type: "restrict", option: "acabamento", values: ["escovado", "polido"] },
            message: "",
          },
          options,
        ),
      ),
    ).toBe(
      "Se Material for Inox e Largura for pelo menos 3 000 mm, então Acabamento só pode ser Escovado ou Polido",
    );
  });

  it("negação, sim/não e obrigatório", () => {
    expect(
      describeRule(
        {
          conditions: [
            { option: "material", op: "not_in", values: ["inox", "ferro"] },
            { option: "motor", op: "is_true" },
          ],
          effect: { type: "require", option: "acabamento" },
          message: "",
        },
        options,
      ),
    ).toBe(
      "Se Material não for Inox ou Ferro e Motorizado for sim, então obriga a preencher Acabamento",
    );
  });
});
