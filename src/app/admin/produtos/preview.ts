/**
 * Preço de exemplo do editor de produto: os valores pré-preenchidos (o meio do
 * intervalo ou o que vem escolhido), o cálculo com IVA e o que cada linha vale
 * nesse exemplo. Puro: recebe o modelo já lido da BD (loadPricingModel) e a taxa
 * de IVA; serve a página (primeira pintura) e o previewAction (recálculo ao vivo).
 */
import { formatDecimal, type Decimal, vatCents, ZERO } from "@/lib/money";
import { allConditionsHold, type ConfigValue, resolveConfig } from "@/lib/options";
import {
  buildScope,
  calculatePrice,
  evaluate,
  parseExpression,
  type PricedLine,
} from "@/lib/pricing";
import type { PricingModel } from "@/server/catalog/formula";

export type SampleInput = Record<string, string | boolean>;

export type PreviewLine = PricedLine & {
  /** Índice da linha de custo de onde veio (null: componente trazido por um valor). */
  sourceIndex: number | null;
};

export type PreviewError = { message: string; sourceIndex: number | null };

export type PreviewResult =
  | {
      ok: true;
      netCents: number;
      /** Fração («0.23»). */
      vatRate: string;
      totalCents: number;
      costCents: number;
      marginCents: number;
      lines: PreviewLine[];
      consumables: { rate: string; costCents: number; priceCents: number } | null;
      variables: Record<string, number>;
    }
  | { ok: false; errors: PreviewError[] }
  | null;

/** O meio do intervalo, encostado ao passo («de 10 em 10 mm»). */
function middle(min: number | null, max: number | null, step: number | null, fallback: number) {
  if (min === null && max === null) return fallback;
  if (min === null) return max!;
  if (max === null) return min;
  const unit = step && step > 0 ? step : 1;
  return min + Math.round((max - min) / 2 / unit) * unit;
}

/**
 * Valores de partida do preço de exemplo: o que vem escolhido; senão o meio do
 * intervalo das medidas e o primeiro valor permitido. Ajusta as escolhas que uma
 * regra deixa de fora (ex.: inox só escovado ou polido).
 */
export function sampleInput(model: PricingModel): SampleInput {
  const input: SampleInput = {};
  for (const option of model.input.options) {
    const meta = model.meta.find((entry) => entry.key === option.key);
    const preset = meta?.defaultValue ?? null;
    if (option.type === "boolean") {
      input[option.key] = preset === true;
    } else if (option.type === "choice") {
      input[option.key] =
        meta?.values.find((value) => value.isDefault)?.key ??
        (typeof preset === "string" ? preset : (option.values?.[0]?.key ?? ""));
    } else {
      const fallback = option.type === "dimension" ? 1000 : 1;
      const value =
        typeof preset === "number"
          ? preset
          : middle(option.min ?? null, option.max ?? null, option.step ?? null, fallback);
      input[option.key] = String(value);
    }
  }
  for (let round = 0; round < 3; round++) {
    const { state } = resolveConfig(model.input.options, model.rules, toConfigInput(model, input));
    let changed = false;
    for (const option of model.input.options) {
      const allowed = state[option.key]?.allowed;
      const chosen = input[option.key];
      if (allowed && typeof chosen === "string" && !allowed.includes(chosen) && allowed[0]) {
        input[option.key] = allowed[0];
        changed = true;
      }
    }
    if (!changed) break;
  }
  return input;
}

/** Converte o que vem dos campos (texto) para o formato que lib/options espera. */
export function toConfigInput(
  model: PricingModel,
  raw: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  for (const option of model.input.options) {
    const value = raw[option.key];
    if (option.type === "boolean") input[option.key] = value === true || value === "on";
    else if (value === null || value === undefined || value === "") continue;
    else if (option.type === "choice") input[option.key] = String(value);
    else input[option.key] = Number(String(value).replace(/\s/g, "").replace(",", "."));
  }
  return input;
}

/** Calcula o preço de exemplo, com IVA, custo e margem, e liga cada linha à sua origem. */
export function computePreview(
  model: PricingModel,
  raw: Readonly<Record<string, unknown>>,
  vatRate: Decimal,
): Exclude<PreviewResult, null> {
  const config = resolveConfig(model.input.options, model.rules, toConfigInput(model, raw));
  const names = new Map(model.meta.map((option) => [option.key, option.name]));
  if (config.errors.length > 0) {
    return {
      ok: false,
      errors: config.errors.map((error) => ({
        message: error.option
          ? `${names.get(error.option) ?? error.option}: ${error.message}`
          : error.message,
        sourceIndex: null,
      })),
    };
  }
  const result = calculatePrice({ ...model.input, values: config.values });
  const indexOfLabel = (label: string) => {
    const index = model.input.lines.findIndex((line) => line.label === label);
    return index === -1 ? null : index;
  };
  if (!result.ok) {
    return {
      ok: false,
      errors: result.errors.map((error) => ({
        message: `${error.source}: ${error.message}`,
        sourceIndex: indexOfLabel(error.source),
      })),
    };
  }
  // As linhas calculadas vêm pela ordem das linhas que se aplicam; depois os componentes.
  const applicable = model.input.lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => allConditionsHold(line.conditions ?? [], config.values));
  const lines: PreviewLine[] = result.lines.map((line, position) => ({
    ...line,
    sourceIndex: applicable[position]?.index ?? null,
  }));
  const costCents =
    result.lines.reduce((total, line) => total + line.costCents, 0) +
    (result.consumables?.costCents ?? 0);
  const vat = vatCents(result.netCents, vatRate);
  return {
    ok: true,
    netCents: result.netCents,
    vatRate: formatDecimal(vatRate),
    totalCents: result.netCents + vat,
    costCents,
    marginCents: result.netCents - costCents,
    lines,
    consumables: result.consumables,
    variables: result.variables,
  };
}

/** Nomes que as fórmulas podem usar no exemplo, com o valor de cada um (as contas auxiliares incluídas). */
export function sampleScope(model: PricingModel, raw: SampleInput): Record<string, number> {
  const config = resolveConfig(model.input.options, model.rules, toConfigInput(model, raw));
  const scope = buildScope(model.input.options, config.values);
  for (const variable of model.input.variables ?? []) {
    try {
      scope[variable.name] = evaluate(parseExpression(variable.expr), scope);
    } catch {
      // Conta que não se calcula neste exemplo: fica de fora.
    }
  }
  return scope;
}

export type LineExample =
  | { applies: false }
  | { applies: true; ok: true; quantity: number; costCents: number; priceCents: number }
  | { applies: true; ok: false; message: string };

/** O que cada linha de custo vale no exemplo (quantidade e preço com margem), uma a uma. */
export function lineExamples(model: PricingModel, raw: SampleInput): LineExample[] {
  const config = resolveConfig(model.input.options, model.rules, toConfigInput(model, raw));
  const values: Readonly<Record<string, ConfigValue>> = config.values;
  return model.input.lines.map((line) => {
    if (!allConditionsHold(line.conditions ?? [], values)) return { applies: false };
    const result = calculatePrice({
      ...model.input,
      values,
      lines: [line],
      valueComponents: {},
      consumablesRate: ZERO,
    });
    if (!result.ok) return { applies: true, ok: false, message: result.errors[0]!.message };
    const priced = result.lines[0];
    if (!priced) return { applies: false };
    return {
      applies: true,
      ok: true,
      quantity: Number(priced.quantity),
      costCents: priced.costCents,
      priceCents: priced.priceCents,
    };
  });
}
