/**
 * Regras da biblioteca só valem para opções da biblioteca: uma divisão criada
 * num produto pode ter a mesma chave (ex.: «cor») sem que uma regra partilhada
 * lhe toque. Puro.
 */
import type { Rule } from "./schema";

/** Todas as opções que uma regra lê ou afeta. */
export function ruleOptionKeys(rule: Rule): string[] {
  const keys = new Set<string>();
  for (const condition of rule.conditions) {
    keys.add(condition.option);
    if ("value" in condition && typeof condition.value === "object" && condition.value) {
      keys.add(condition.value.option);
    }
  }
  if ("option" in rule.effect) keys.add(rule.effect.option);
  return [...keys];
}

/** Só as regras cujas opções são todas da biblioteca e estão no produto. */
export function applicableLibraryRules<R extends Rule>(
  rules: readonly R[],
  libraryKeysInProduct: ReadonlySet<string>,
): R[] {
  return rules.filter((rule) => ruleOptionKeys(rule).every((key) => libraryKeysInProduct.has(key)));
}
