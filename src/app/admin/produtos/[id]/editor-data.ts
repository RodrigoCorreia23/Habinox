/**
 * Contas do editor de produto feitas no servidor a partir do que já foi lido:
 * os problemas que impedem publicar, cada um ligado ao sítio onde se resolve
 * («Corrigir» → #linha-…), o estado de cada passo e as frases dos resumos.
 * Puro: não lê a BD.
 */
import type { OptionInfo } from "@/components/admin/conditions-editor";
import { describeRule } from "@/components/admin/describe-rule";
import type { StepStatus } from "@/components/admin/step-list";
import { type Condition, type Rule, validateRules } from "@/lib/options";
import { validateFormula } from "@/lib/pricing";
import type { PricingModel } from "@/server/catalog/formula";

export type ProblemSection = "opcoes" | "regras" | "preco";
export type Problem = { section: ProblemSection; message: string; href: string };

/** Troca as chaves técnicas pelos nomes das opções («largura» → «Largura»). */
export function withOptionNames(message: string, options: OptionInfo[]) {
  const sorted = [...options].sort((a, b) => b.key.length - a.key.length);
  let text = message;
  for (const option of sorted) {
    text = text.replace(new RegExp(`(?<![\\w.])${option.key}(?![\\w])`, "g"), `«${option.name}»`);
  }
  return text;
}

/** «só quando Motorização for Motorizado» (para o resumo de uma linha de custo). */
export function conditionsText(conditions: Condition[], options: OptionInfo[]) {
  if (conditions.length === 0) return null;
  const sentence = describeRule({ conditions, effect: { type: "forbid" }, message: "" }, options);
  return sentence.replace(/^Se /, "só quando ").replace(/, então .*$/, "");
}

/**
 * Os mesmos problemas que checkVersion encontra, mas com o sítio onde se resolvem.
 * checkVersion continua a ser quem decide se se pode publicar.
 */
export function locateProblems(input: {
  model: PricingModel;
  options: OptionInfo[];
  versionOptions: { id: string; name: string; type: string; allowedCount: number }[];
  variables: { id: string; label: string }[];
  lines: { id: string; label: string }[];
  rules: { id: string; rule: Rule }[];
  libraryRules: Rule[];
}): Problem[] {
  const { model, options } = input;
  const problems: Problem[] = [];
  const add = (section: ProblemSection, message: string, href: string) =>
    problems.push({ section, message: withOptionNames(message, options), href });

  if (input.versionOptions.length === 0) {
    add("opcoes", "O produto ainda não tem opções.", "#opcoes");
  }
  for (const option of input.versionOptions) {
    if (option.type === "choice" && option.allowedCount === 0) {
      add("opcoes", `«${option.name}» não tem valores disponíveis.`, `#opcao-${option.id}`);
    }
  }

  for (const issue of validateRules(
    model.input.options,
    input.rules.map((entry) => entry.rule),
  )) {
    const rule = input.rules[issue.index];
    add(
      "regras",
      `Regra ${issue.index + 1}: ${issue.message}.`,
      rule ? `#regra-${rule.id}` : "#regras",
    );
  }
  for (const issue of validateRules(model.input.options, input.libraryRules, { library: true })) {
    add(
      "regras",
      `Regra ${issue.index + 1} da biblioteca: ${issue.message}.`,
      "/admin/opcoes/regras",
    );
  }

  if (input.lines.length === 0) {
    add("preco", "A fórmula ainda não tem linhas de custo.", "#preco");
  }
  for (const issue of validateFormula({
    options: model.input.options,
    variables: model.input.variables ?? [],
    lines: model.input.lines,
  })) {
    if (issue.where.kind === "variable") {
      const variable = input.variables[issue.where.index];
      add(
        "preco",
        `Conta «${variable?.label ?? ""}»: ${issue.message}.`,
        variable ? `#conta-${variable.id}` : "#contas",
      );
    } else {
      const line = input.lines[issue.where.index];
      add(
        "preco",
        `Linha «${line?.label ?? ""}»: ${issue.message}.`,
        line ? `#linha-${line.id}` : "#preco",
      );
    }
  }

  const noMargin = new Set<string>();
  model.input.lines.forEach((line, index) => {
    const id = input.lines[index]?.id;
    const href = id ? `#linha-${id}` : "#preco";
    const items = [
      ...(line.item ? [line.item] : []),
      ...Object.values(line.itemByOption?.items ?? {}),
    ];
    for (const item of items) {
      if (item.margin === null && !noMargin.has(item.name)) {
        noMargin.add(item.name);
        add("preco", `Falta a margem de «${item.name}».`, href);
      }
    }
    if (line.itemByOption && Object.keys(line.itemByOption.items).length === 0) {
      add("preco", `Linha «${line.label}»: nenhum valor da escolha tem material.`, href);
    } else if (!line.item && !line.itemByOption) {
      add("preco", `Linha «${line.label}»: o material ou a secção já não existe.`, href);
    }
  });
  for (const byValue of Object.values(model.input.valueComponents ?? {})) {
    for (const item of Object.values(byValue)) {
      if (item.margin === null && !noMargin.has(item.name)) {
        noMargin.add(item.name);
        add("preco", `Falta a margem de «${item.name}».`, "/admin/materiais?filtro=sem-margem");
      }
    }
  }
  return problems;
}

/** Problemas de cada regra do produto, pela posição, com os nomes das opções. */
export function ruleIssuesAt(model: PricingModel, rules: Rule[], options: OptionInfo[]) {
  const byIndex = new Map<number, string[]>();
  for (const issue of validateRules(model.input.options, rules)) {
    const list = byIndex.get(issue.index) ?? [];
    list.push(withOptionNames(issue.message, options));
    byIndex.set(issue.index, list);
  }
  return byIndex;
}

/** Estado de um passo: «!» com problemas; feito; ou por fazer. */
export function stepStatus(problems: number, done: boolean, next: boolean): StepStatus {
  if (problems > 0) return "problem";
  if (done) return "done";
  return next ? "current" : "todo";
}
