/**
 * Verifica uma fórmula antes de a deixar validar/publicar: expressões que não
 * se leem, variáveis que não existem, nomes repetidos, variáveis que usam
 * outras definidas mais abaixo. Puro; o backoffice mostra os problemas junto
 * da linha ou variável onde estão.
 */
import type { ProductOptionDef } from "@/lib/options";
import { ExpressionError, parseExpression, variablesOf } from "./expression";

export interface FormulaIssue {
  /** "variable" | "line", e o índice na lista. */
  where: { kind: "variable" | "line"; index: number };
  message: string;
}

/** Nomes que as expressões podem usar, vindos das opções do produto. */
export function optionScopeNames(options: readonly ProductOptionDef[]): Set<string> {
  const names = new Set<string>();
  for (const option of options) {
    const name = option.var ?? option.key;
    if (option.type === "choice") {
      for (const value of option.values ?? []) {
        for (const param of Object.keys(value.params ?? {})) names.add(`${name}.${param}`);
      }
    } else {
      names.add(name);
    }
  }
  return names;
}

function check(
  source: string,
  known: Set<string>,
  where: FormulaIssue["where"],
  issues: FormulaIssue[],
  later: Set<string>,
) {
  let expr;
  try {
    expr = parseExpression(source);
  } catch (error) {
    const message = error instanceof ExpressionError ? error.message : String(error);
    issues.push({ where, message });
    return;
  }
  for (const name of variablesOf(expr)) {
    if (known.has(name)) continue;
    issues.push({
      where,
      message: later.has(name)
        ? `"${name}" está definida mais abaixo: mova-a para cima`
        : `"${name}" não existe neste produto`,
    });
  }
}

export function validateFormula(input: {
  options: readonly ProductOptionDef[];
  variables: readonly { name: string; expr: string }[];
  lines: readonly { quantityExpr: string }[];
}): FormulaIssue[] {
  const issues: FormulaIssue[] = [];
  const known = optionScopeNames(input.options);
  const optionNames = new Set(input.options.map((option) => option.var ?? option.key));
  const allVariables = new Set(input.variables.map((variable) => variable.name));

  input.variables.forEach((variable, index) => {
    const where = { kind: "variable" as const, index };
    if (optionNames.has(variable.name)) {
      issues.push({ where, message: `"${variable.name}" já é o nome de uma opção` });
    } else if (known.has(variable.name)) {
      issues.push({ where, message: `"${variable.name}" está repetida` });
    }
    const later = new Set([...allVariables].filter((name) => !known.has(name)));
    check(variable.expr, known, where, issues, later);
    known.add(variable.name);
  });

  input.lines.forEach((line, index) => {
    check(line.quantityExpr, known, { kind: "line", index }, issues, new Set());
  });

  return issues;
}
