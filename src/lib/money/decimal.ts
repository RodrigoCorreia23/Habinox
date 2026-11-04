/**
 * Decimal de ponto fixo sobre BigInt, para as contas intermédias do preço
 * (custo × quantidade × margem). Nunca float para dinheiro: os custos chegam
 * da BD como texto (`numeric(12,4)`) e os resultados acabam em cêntimos.
 *
 * Valor = units / 10^SCALE. Arredondamento: metade para longe do zero
 * (o arredondamento aritmético usado em faturação).
 */
export const SCALE = 8;
const FACTOR = 10n ** BigInt(SCALE);
const CENTS_DIVISOR = 10n ** BigInt(SCALE - 2);

export type Decimal = bigint & { readonly __brand: "Decimal" };

const DECIMAL_PATTERN = /^(-?)(\d+)(?:\.(\d+))?$/;

/** Divide `n` por `d` (> 0) e arredonda metade para longe do zero. */
function divRound(n: bigint, d: bigint): bigint {
  const q = n / d;
  const r = n % d;
  if (r === 0n) return q;
  const twice = (r < 0n ? -r : r) * 2n;
  if (twice >= d) return n < 0n ? q - 1n : q + 1n;
  return q;
}

/** Lê um decimal em texto ("12.4000", "-3", "0.23"). Recusa mais casas do que SCALE. */
export function parseDecimal(value: string): Decimal {
  const match = DECIMAL_PATTERN.exec(value.trim());
  if (!match) throw new Error(`Decimal inválido: "${value}"`);
  const [, sign = "", intPart = "0", fracPart = ""] = match;
  if (fracPart.length > SCALE) {
    throw new Error(`Decimal com mais de ${SCALE} casas: "${value}"`);
  }
  const units = BigInt(intPart) * FACTOR + BigInt(fracPart.padEnd(SCALE, "0") || "0");
  return (sign === "-" ? -units : units) as Decimal;
}

/**
 * Converte um número vindo das expressões (quantidades em m, m², horas).
 * Arredonda a SCALE casas: o erro de float fica muito abaixo do cêntimo.
 */
export function decimalFromNumber(value: number): Decimal {
  if (!Number.isFinite(value) || Math.abs(value) >= 1e12) {
    throw new Error(`Número fora do intervalo: ${value}`);
  }
  return parseDecimal(value.toFixed(SCALE));
}

export function decimalFromCents(cents: number): Decimal {
  if (!Number.isSafeInteger(cents)) throw new Error(`Cêntimos não inteiros: ${cents}`);
  return (BigInt(cents) * CENTS_DIVISOR) as Decimal;
}

export const ZERO = 0n as Decimal;
export const ONE = FACTOR as Decimal;

export function add(a: Decimal, b: Decimal): Decimal {
  return (a + b) as Decimal;
}

export function sub(a: Decimal, b: Decimal): Decimal {
  return (a - b) as Decimal;
}

export function mul(a: Decimal, b: Decimal): Decimal {
  return divRound(a * b, FACTOR) as Decimal;
}

export function sum(values: readonly Decimal[]): Decimal {
  return values.reduce<Decimal>(add, ZERO);
}

export function isNegative(value: Decimal): boolean {
  return value < 0n;
}

/** Arredonda ao cêntimo. */
export function toCents(value: Decimal): number {
  const cents = divRound(value, CENTS_DIVISOR);
  const result = Number(cents);
  if (!Number.isSafeInteger(result)) throw new Error("Valor demasiado grande");
  return result;
}

/** Texto com SCALE casas, para snapshots ("12.40000000"). */
export function formatDecimal(value: Decimal): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const intPart = abs / FACTOR;
  const fracPart = (abs % FACTOR).toString().padStart(SCALE, "0");
  return `${negative ? "-" : ""}${intPart}.${fracPart}`;
}
