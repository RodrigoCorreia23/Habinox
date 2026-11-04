/**
 * Verifica as regras de um produto antes de publicar. O configurador avalia
 * as regras numa passagem, de cima para baixo, por isso uma regra que afeta
 * uma opção só pode depender de opções que estejam acima dela.
 */
import type { ProductOptionDef, Rule } from "./schema";

export interface RuleIssue {
  index: number;
  message: string;
}

const conditionOptions = (rule: Rule) =>
  rule.conditions.flatMap((condition) =>
    "value" in condition && typeof condition.value === "object"
      ? [condition.option, condition.value.option]
      : [condition.option],
  );

/**
 * `library`: regras da biblioteca. Uma regra da biblioteca que fale de opções
 * que o produto não usa simplesmente não se aplica; só a ordem conta.
 */
export function validateRules(
  options: readonly ProductOptionDef[],
  rules: readonly Rule[],
  { library = false } = {},
): RuleIssue[] {
  const position = new Map(options.map((option, index) => [option.key, index]));
  const issues: RuleIssue[] = [];

  rules.forEach((rule, index) => {
    const used = conditionOptions(rule);
    const missing = used.filter((key) => !position.has(key));
    const target = "option" in rule.effect ? rule.effect.option : null;

    if (missing.length > 0 || (target && !position.has(target))) {
      if (!library) {
        const names = [...missing, ...(target && !position.has(target) ? [target] : [])];
        issues.push({
          index,
          message: `Usa opções que o produto não tem: ${[...new Set(names)].join(", ")}`,
        });
      }
      return;
    }
    if (target === null) return;

    const targetPosition = position.get(target)!;
    const after = used.filter((key) => position.get(key)! >= targetPosition);
    if (after.length > 0) {
      issues.push({
        index,
        message: `Depende de ${[...new Set(after)].join(", ")}, que não está acima de ${target}: mude a ordem das opções`,
      });
    }

    if (rule.effect.type === "restrict") {
      const allowed = new Set(options[targetPosition]!.values?.map((value) => value.key) ?? []);
      if (!rule.effect.values.some((value) => allowed.has(value))) {
        issues.push({
          index,
          message: `Nenhum dos valores permitidos de ${target} sobra com esta regra`,
        });
      }
    }
  });
  return issues;
}
