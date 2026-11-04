/**
 * Dinheiro em cêntimos (inteiros) e IVA. Puro: sem BD nem I/O.
 * A taxa de IVA vem de `settings` e entra aqui como Decimal (0.23).
 */
import { decimalFromCents, mul, toCents, type Decimal } from "./decimal";

export * from "./decimal";
export * from "./input";

export function assertCents(value: number): number {
  if (!Number.isSafeInteger(value)) throw new Error(`Cêntimos não inteiros: ${value}`);
  return value;
}

export function sumCents(values: readonly number[]): number {
  return values.reduce((total, value) => assertCents(total + assertCents(value)), 0);
}

/** IVA de um total sem IVA, arredondado ao cêntimo. Aplica-se uma vez, ao total. */
export function vatCents(netCents: number, rate: Decimal): number {
  return toCents(mul(decimalFromCents(assertCents(netCents)), rate));
}

/** "2 786,43 €" (pt-PT agrupa milhares só a partir de 10 000 sem `useGrouping: "always"`). */
export function formatEuros(cents: number, locale = "pt-PT"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    useGrouping: "always",
  }).format(assertCents(cents) / 100);
}
