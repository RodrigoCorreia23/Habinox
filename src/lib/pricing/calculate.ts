/**
 * Preço de um produto configurado, sem IVA, com a decomposição por linha
 * que se guarda no snapshot do orçamento/encomenda.
 *
 *   linha        = quantidade × custo unitário × (1 + margem do item)
 *   consumíveis  = Σ (custo das linhas de material × taxa) × (1 + margem do material)
 *   preço s/ IVA = Σ linhas + consumíveis (cada uma arredondada ao cêntimo)
 *
 * A margem é de cada item (material, sector, componente) e é obrigatória:
 * um item com margem por decidir (null) impede o cálculo. Instalação por
 * zona, transporte e IVA tratam-se na encomenda, fora daqui.
 *
 * Puro: recebe tudo já lido da BD e as escolhas já resolvidas por lib/options.
 */
import {
  add,
  decimalFromNumber,
  formatDecimal,
  isNegative,
  mul,
  ONE,
  sum,
  toCents,
  ZERO,
  type Decimal,
} from "@/lib/money";
import {
  allConditionsHold,
  type Condition,
  type ProductOptionDef,
  type ResolvedValues,
} from "@/lib/options";
import { evaluate, ExpressionError, parseExpression, variablesOf } from "./expression";

/** Material, sector (custo por hora) ou componente, com a sua margem. */
export interface PricedItem {
  code: string;
  name: string;
  /** Custo por unidade, sem IVA. */
  unitCost: Decimal;
  /** Fração (0.05 = 5%); null = por decidir. */
  margin: Decimal | null;
}

export type LineKind = "material" | "labour" | "external" | "component";

export interface FormulaLine {
  label: string;
  kind: LineKind;
  quantityExpr: string;
  unit: string;
  /** A linha só conta se todas se cumprirem. */
  conditions?: readonly Condition[];
  /** Artigo fixo, sector ou componente. */
  item?: PricedItem;
  /** Artigo escolhido pelo valor de uma opção (ex.: material → tubo em ferro ou inox). */
  itemByOption?: { option: string; items: Readonly<Record<string, PricedItem>> };
}

export interface FormulaVariable {
  name: string;
  expr: string;
}

export interface PricingInput {
  options: readonly ProductOptionDef[];
  values: ResolvedValues;
  /** Componentes trazidos por valores de opção: opção → valor → componente (quantidade 1). */
  valueComponents?: Readonly<Record<string, Readonly<Record<string, PricedItem>>>>;
  variables?: readonly FormulaVariable[];
  lines: readonly FormulaLine[];
  /** Consumíveis em fração dos materiais (0.10 = 10%). */
  consumablesRate: Decimal;
}

export interface PricedLine {
  label: string;
  kind: LineKind;
  unit: string;
  quantity: string;
  itemCode: string;
  itemName: string;
  unitCost: string;
  margin: string;
  costCents: number;
  priceCents: number;
}

export type PricingErrorCode =
  "expression" | "missing_variable" | "unavailable" | "margin_undefined" | "negative_quantity";

export interface PricingError {
  code: PricingErrorCode;
  /** Linha ou variável onde aconteceu. */
  source: string;
  message: string;
}

export type PricingResult =
  | {
      ok: true;
      netCents: number;
      lines: PricedLine[];
      consumables: { rate: string; costCents: number; priceCents: number } | null;
      variables: Record<string, number>;
    }
  | { ok: false; errors: PricingError[] };

/** Variáveis que as expressões podem usar, a partir das escolhas. */
export function buildScope(
  options: readonly ProductOptionDef[],
  values: ResolvedValues,
): Record<string, number> {
  const scope: Record<string, number> = {};
  for (const option of options) {
    const name = option.var ?? option.key;
    const value = values[option.key];
    switch (option.type) {
      case "dimension":
        // Guardado em mm, usado em metros.
        if (typeof value === "number") scope[name] = value / 1000;
        break;
      case "number":
        if (typeof value === "number") scope[name] = value;
        break;
      case "boolean":
        scope[name] = value === true ? 1 : 0;
        break;
      case "choice": {
        const chosen = option.values?.find((candidate) => candidate.key === value);
        for (const [param, number] of Object.entries(chosen?.params ?? {})) {
          scope[`${name}.${param}`] = number;
        }
        break;
      }
    }
  }
  return scope;
}

function describe(error: unknown): { code: PricingErrorCode; message: string } {
  if (error instanceof ExpressionError && error.message.startsWith("Variável desconhecida")) {
    return { code: "missing_variable", message: error.message };
  }
  return { code: "expression", message: error instanceof Error ? error.message : String(error) };
}

function evaluateSource(source: string, scope: Record<string, number>): number {
  return evaluate(parseExpression(source), scope);
}

function lineItem(line: FormulaLine, values: ResolvedValues): PricedItem | undefined {
  if (line.item) return line.item;
  if (!line.itemByOption) return undefined;
  const chosen = values[line.itemByOption.option];
  if (typeof chosen !== "string") return undefined;
  return Object.hasOwn(line.itemByOption.items, chosen)
    ? line.itemByOption.items[chosen]
    : undefined;
}

export function calculatePrice(input: PricingInput): PricingResult {
  const errors: PricingError[] = [];
  const scope = buildScope(input.options, input.values);

  // Variáveis calculadas, por ordem; cada uma pode usar as anteriores.
  const variables: Record<string, number> = {};
  const failedVariables = new Set<string>();
  for (const variable of input.variables ?? []) {
    try {
      const value = evaluateSource(variable.expr, scope);
      scope[variable.name] = value;
      variables[variable.name] = value;
    } catch (error) {
      // Só é erro se alguma linha aplicável a usar (ex.: medida escondida).
      failedVariables.add(variable.name);
      const usedSomewhere = input.lines.some(
        (line) =>
          allConditionsHold(line.conditions ?? [], input.values) &&
          safeVariablesOf(line.quantityExpr).has(variable.name),
      );
      if (usedSomewhere) errors.push({ source: variable.name, ...describe(error) });
    }
  }

  const priced: { line: PricedLine; cost: Decimal; margin: Decimal }[] = [];

  const addLine = (line: FormulaLine, item: PricedItem | undefined, quantityValue: number) => {
    if (!item) {
      errors.push({
        code: "unavailable",
        source: line.label,
        message: "Combinação não disponível (sem artigo para o valor escolhido)",
      });
      return;
    }
    if (item.margin === null) {
      errors.push({
        code: "margin_undefined",
        source: line.label,
        message: `Margem por decidir em "${item.name}"`,
      });
      return;
    }
    const quantity = decimalFromNumber(quantityValue);
    if (isNegative(quantity)) {
      errors.push({
        code: "negative_quantity",
        source: line.label,
        message: "Quantidade negativa",
      });
      return;
    }
    const cost = mul(quantity, item.unitCost);
    const price = mul(cost, add(ONE, item.margin));
    priced.push({
      cost,
      margin: item.margin,
      line: {
        label: line.label,
        kind: line.kind,
        unit: line.unit,
        quantity: formatDecimal(quantity),
        itemCode: item.code,
        itemName: item.name,
        unitCost: formatDecimal(item.unitCost),
        margin: formatDecimal(item.margin),
        costCents: toCents(cost),
        priceCents: toCents(price),
      },
    });
  };

  for (const line of input.lines) {
    if (!allConditionsHold(line.conditions ?? [], input.values)) continue;
    let quantity: number;
    try {
      quantity = evaluateSource(line.quantityExpr, scope);
    } catch (error) {
      const failed = [...safeVariablesOf(line.quantityExpr)].find((name) =>
        failedVariables.has(name),
      );
      // O erro da variável já foi registado; não repetir.
      if (!failed) errors.push({ source: line.label, ...describe(error) });
      continue;
    }
    addLine(line, lineItem(line, input.values), quantity);
  }

  // Componentes trazidos pelos valores escolhidos (ex.: "Motor e 2 comandos").
  for (const option of input.options) {
    const chosen = input.values[option.key];
    if (typeof chosen !== "string") continue;
    const components = input.valueComponents?.[option.key];
    if (!components || !Object.hasOwn(components, chosen)) continue;
    const component = components[chosen]!;
    addLine(
      { label: component.name, kind: "component", quantityExpr: "1", unit: "un." },
      component,
      1,
    );
  }

  if (errors.length > 0) return { ok: false, errors };

  const materials = priced.filter((entry) => entry.line.kind === "material");
  let consumables: { rate: string; costCents: number; priceCents: number } | null = null;
  if (materials.length > 0 && input.consumablesRate > ZERO) {
    const cost = sum(materials.map((entry) => mul(entry.cost, input.consumablesRate)));
    const price = sum(
      materials.map((entry) => mul(mul(entry.cost, input.consumablesRate), add(ONE, entry.margin))),
    );
    consumables = {
      rate: formatDecimal(input.consumablesRate),
      costCents: toCents(cost),
      priceCents: toCents(price),
    };
  }

  const netCents =
    priced.reduce((total, entry) => total + entry.line.priceCents, 0) +
    (consumables?.priceCents ?? 0);

  return { ok: true, netCents, lines: priced.map((entry) => entry.line), consumables, variables };
}

function safeVariablesOf(source: string): Set<string> {
  try {
    return variablesOf(parseExpression(source));
  } catch {
    return new Set();
  }
}
