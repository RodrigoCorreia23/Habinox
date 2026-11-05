import type { OptionInfo } from "@/components/admin/conditions-editor";
import type { RuleValues } from "@/components/admin/rule-form";

/** Comparações numéricas por extenso, como no construtor de regras. */
export const NUMERIC_OP_WORDS = {
  gt: "maior que",
  gte: "pelo menos",
  lt: "menor que",
  lte: "até",
} as const;

const numberFormat = new Intl.NumberFormat("pt-PT", {
  useGrouping: "always",
  maximumFractionDigits: 4,
});

function list(items: string[], last: string) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${last} ${items[items.length - 1]}`;
}

/**
 * Frase da regra em português corrente, sem símbolos:
 * «Se Material for Inox, então Acabamento só pode ser Escovado ou Polido».
 * «Se Altura for maior que Largura, então não é possível («…»)».
 */
export function describeRule(rule: RuleValues, options: OptionInfo[]): string {
  const option = (key: string) => options.find((candidate) => candidate.key === key);
  const name = (key: string) => option(key)?.name ?? key;
  const label = (optionKey: string, valueKey: string) =>
    option(optionKey)?.values.find((value) => value.key === valueKey)?.label ?? valueKey;
  const unitOf = (key: string) => {
    const found = option(key);
    return found?.unit ?? (found?.type === "dimension" ? "mm" : null);
  };

  const conditions = rule.conditions.map((condition) => {
    switch (condition.op) {
      case "eq":
      case "ne":
        return `${name(condition.option)} ${condition.op === "eq" ? "for" : "não for"} ${label(condition.option, condition.value)}`;
      case "in":
      case "not_in":
        return `${name(condition.option)} ${condition.op === "in" ? "for" : "não for"} ${list(
          condition.values.map((value) => label(condition.option, value)),
          "ou",
        )}`;
      case "is_true":
        return `${name(condition.option)} for sim`;
      case "is_false":
        return `${name(condition.option)} for não`;
      default: {
        const words = NUMERIC_OP_WORDS[condition.op];
        if (typeof condition.value === "number") {
          const unit = unitOf(condition.option);
          return `${name(condition.option)} for ${words} ${numberFormat.format(condition.value)}${unit ? ` ${unit}` : ""}`;
        }
        const factor = condition.value.factor;
        const other = name(condition.value.option);
        return factor === 1
          ? `${name(condition.option)} for ${words} ${other}`
          : `${name(condition.option)} for ${words} ${numberFormat.format(factor)} vezes ${other}`;
      }
    }
  });

  const effect = rule.effect;
  const result =
    effect.type === "forbid"
      ? `não é possível${rule.message ? ` («${rule.message}»)` : ""}`
      : effect.type === "hide"
        ? `esconde ${name(effect.option)}`
        : effect.type === "require"
          ? `obriga a preencher ${name(effect.option)}`
          : `${name(effect.option)} só pode ser ${list(
              effect.values.map((value) => label(effect.option, value)),
              "ou",
            )}`;

  if (conditions.length === 0) return `Sempre: ${result}`;
  return `Se ${conditions.join(" e ")}, então ${result}`;
}
