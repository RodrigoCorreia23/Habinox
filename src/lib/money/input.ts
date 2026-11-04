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
