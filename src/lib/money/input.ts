/**
 * Valores em euros escritos no backoffice ("23,50", "1 290", "120 €") → cêntimos.
 * Em texto, sem float.
 */
const EURO_INPUT = /^(\d{1,7})(?:[.,](\d{1,2}))?$/;

export type EuroParse = { ok: true; cents: number } | { ok: false; message: string };

export function parseEuroInput(input: string): EuroParse {
  const cleaned = input
    .trim()
    .replace(/\s*€$/, "")
    .replace(/[\s  ]/g, "");
  const match = EURO_INPUT.exec(cleaned);
  if (!match) return { ok: false, message: "Escreva um valor em euros, ex.: 23,50" };
  const [, euros = "0", cents = ""] = match;
  return { ok: true, cents: Number(euros) * 100 + Number(cents.padEnd(2, "0")) };
}

/** 2350 → "23,50" (para preencher campos). */
export function centsToEuroInput(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}

/**
 * Custo de um material escrito no backoffice ("12,40", "0,0350") → texto decimal
 * com 4 casas, como na BD (`numeric(12,4)`): "12.4000". Sem float.
 */
const COST_INPUT = /^(\d{1,8})(?:[.,](\d{1,4}))?$/;

export type CostParse = { ok: true; value: string } | { ok: false; message: string };

export function parseCostInput(input: string): CostParse {
  const cleaned = input
    .trim()
    .replace(/\s*€.*$/, "")
    .replace(/[\s  ]/g, "");
  const match = COST_INPUT.exec(cleaned);
  if (!match) return { ok: false, message: "Escreva um custo em euros, ex.: 12,40" };
  const [, whole = "0", decimals = ""] = match;
  return { ok: true, value: `${Number(whole)}.${decimals.padEnd(4, "0")}` };
}

/** "12.4000" → "12,40"; "0.0350" → "0,035" (pelo menos 2 casas, sem zeros a mais). */
export function costToInput(value: string): string {
  const [whole = "0", decimals = ""] = value.split(".");
  const trimmed = decimals.replace(/0+$/, "").padEnd(2, "0");
  return `${whole},${trimmed}`;
}
