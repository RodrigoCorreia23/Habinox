import type { OptionInfo } from "@/components/admin/conditions-editor";
import type { RuleValues } from "@/components/admin/rule-form";

/** Frase curta para a lista: "Se Material é Inox → Acabamento só Escovado, Polido". */
export function describeRule(rule: RuleValues, options: OptionInfo[]): string {
  const name = (key: string) => options.find((option) => option.key === key)?.name ?? key;
  const label = (optionKey: string, valueKey: string) =>
    options
      .find((option) => option.key === optionKey)
      ?.values.find((value) => value.key === valueKey)?.label ?? valueKey;
  const ops: Record<string, string> = { gt: ">", gte: "≥", lt: "<", lte: "≤" };
  const conditions = rule.conditions
    .map((condition) => {
      switch (condition.op) {
        case "eq":
        case "ne":
          return `${name(condition.option)} ${condition.op === "eq" ? "é" : "não é"} ${label(condition.option, condition.value)}`;
        case "in":
        case "not_in":
          return `${name(condition.option)} ${condition.op === "in" ? "é" : "não é"} ${condition.values.map((value) => label(condition.option, value)).join(" ou ")}`;
        case "is_true":
          return `${name(condition.option)} é sim`;
        case "is_false":
          return `${name(condition.option)} é não`;
        default:
          return typeof condition.value === "number"
            ? `${name(condition.option)} ${ops[condition.op]} ${condition.value}`
            : `${name(condition.option)} ${ops[condition.op]} ${name(condition.value.option)} × ${String(condition.value.factor).replace(".", ",")}`;
      }
    })
    .join(" e ");
  const effect = rule.effect;
  const result =
    effect.type === "forbid"
      ? `não é possível${rule.message ? ` (“${rule.message}”)` : ""}`
      : effect.type === "hide"
        ? `esconde ${name(effect.option)}`
        : effect.type === "require"
          ? `${name(effect.option)} é obrigatória`
          : `${name(effect.option)} só ${effect.values.map((value) => label(effect.option, value)).join(", ")}`;
  return `Se ${conditions} → ${result}`;
}
