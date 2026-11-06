/**
 * Os valores que vêm escolhidos (o valor por omissão de cada escolha e os
 * sim/não desligados) não podem cair numa regra que bloqueia: senão o
 * configurador da loja abre logo com «não é possível». As medidas não contam
 * (o cliente escreve-as), por isso regras sobre medidas não disparam aqui.
 */
import { resolveConfig } from "./resolve";
import type { ProductOptionDef, Rule } from "./schema";

export function blockedDefaults(
  options: readonly ProductOptionDef[],
  rules: readonly Rule[],
  defaults: Readonly<Record<string, string | boolean>>,
): string[] {
  const input: Record<string, unknown> = {};
  for (const option of options) {
    if (option.type === "choice" && typeof defaults[option.key] === "string") {
      input[option.key] = defaults[option.key];
    } else if (option.type === "boolean") {
      input[option.key] = defaults[option.key] === true;
    }
  }
  return resolveConfig(options, rules, input)
    .errors.filter((error) => error.code === "forbidden")
    .map((error) => error.message);
}
