/**
 * Construtor de produto: cada linha de custo diz «como conta» sem fórmula à
 * vista — quantidade = fixo + fator × base, com a base a sair das medidas
 * (largura L e altura H, em metros na fórmula). Puro e testado: daqui sai a
 * expressão que o motor de preços avalia e a frase que o Bruno lê.
 */
import { parseExpression } from "./expression";

export const BASES = ["one", "area", "width", "height", "perimeter"] as const;
export type Basis = (typeof BASES)[number];

export interface BuilderSpec {
  basis: Basis;
  /** Texto decimal com ponto ("2", "0.5"). */
  factor: string;
  /** Texto decimal com ponto; "0" = sem parte fixa. */
  fixed: string;
}

/** Expressão de cada base; as letras L e H são as medidas marcadas como largura e altura. */
export const BASIS_EXPR: Record<Basis, string> = {
  one: "1",
  area: "L * H",
  width: "L",
  height: "H",
  perimeter: "2 * (L + H)",
};

/** Que medidas cada base precisa no produto. */
export const BASIS_NEEDS: Record<Basis, ("L" | "H")[]> = {
  one: [],
  area: ["L", "H"],
  width: ["L"],
  height: ["H"],
  perimeter: ["L", "H"],
};

/** Nome curto de cada base para o Bruno (a unidade da linha é dele). */
export const BASIS_LABEL: Record<Basis, string> = {
  one: "uma vez",
  area: "por m²",
  width: "por metro de largura",
  height: "por metro de altura",
  perimeter: "por metro de perímetro",
};

const DECIMAL = /^\d{1,6}(\.\d{1,4})?$/;

/** "2,5" / "2.5" / " 2 " → "2.5"; vazio → fallback; inválido → null. */
export function parseBuilderNumber(input: string, fallback: string): string | null {
  const text = input.trim().replace(",", ".");
  if (text === "") return fallback;
  if (!DECIMAL.test(text)) return null;
  return String(Number(text));
}

const pt = (value: string) => value.replace(".", ",");

/** Quantidade do motor: "1 + 2 * (L * H)". Sempre parseável pelo analisador de expressões. */
export function builderExpression(spec: BuilderSpec): string {
  const fixed = Number(spec.fixed);
  const factor = Number(spec.factor);
  const base = BASIS_EXPR[spec.basis];
  let variable = "";
  if (factor !== 0) {
    if (spec.basis === "one") variable = pt(spec.factor);
    else variable = factor === 1 ? `(${base})` : `${pt(spec.factor)} * (${base})`;
  }
  const expression =
    fixed !== 0 && variable ? `${pt(spec.fixed)} + ${variable}` : variable || pt(spec.fixed);
  parseExpression(expression); // garante que o motor a aceita
  return expression;
}

/** Frase para o Bruno: «2 × m²», «1 h + 2 h × m²», «uma vez». */
export function describeQuantity(spec: BuilderSpec, unit: string): string {
  const fixed = Number(spec.fixed);
  const factor = Number(spec.factor);
  const u = unit ? ` ${unit}` : "";
  const per: Record<Basis, string> = {
    one: "",
    area: "por m²",
    width: "por metro de largura",
    height: "por metro de altura",
    perimeter: "por metro de perímetro",
  };
  const variable =
    factor === 0
      ? ""
      : spec.basis === "one"
        ? `${pt(spec.factor)}${u}`
        : `${pt(spec.factor)}${u} ${per[spec.basis]}`;
  if (fixed !== 0 && variable) return `${pt(spec.fixed)}${u} + ${variable}`;
  if (variable) return variable;
  return `${pt(spec.fixed)}${u}`;
}
