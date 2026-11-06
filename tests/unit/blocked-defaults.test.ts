import { describe, expect, it } from "vitest";
import { blockedDefaults, type ProductOptionDef, type Rule } from "@/lib/options";

const options: ProductOptionDef[] = [
  { key: "largura", type: "dimension", var: "L", required: true, min: 250, max: 600, step: 10 },
  { key: "cor", type: "choice", required: true, values: [{ key: "verde" }, { key: "preto" }] },
  { key: "fechadura", type: "boolean", required: false },
];
const forbidGreen: Rule = {
  conditions: [{ option: "cor", op: "in", values: ["verde"] }],
  effect: { type: "forbid" },
  message: "Verde só por pedido",
};

describe("blockedDefaults", () => {
  it("avisa quando a cor que vem escolhida é bloqueada", () => {
    expect(blockedDefaults(options, [forbidGreen], { cor: "verde" })).toEqual([
      "Verde só por pedido",
    ]);
  });

  it("não avisa com outra cor por omissão", () => {
    expect(blockedDefaults(options, [forbidGreen], { cor: "preto" })).toEqual([]);
  });

  it("regras sobre medidas não contam (o cliente escreve-as)", () => {
    const wide: Rule = {
      conditions: [{ option: "largura", op: "gt", value: 500 }],
      effect: { type: "forbid" },
      message: "Largo demais",
    };
    expect(blockedDefaults(options, [wide], { cor: "preto" })).toEqual([]);
  });
});
