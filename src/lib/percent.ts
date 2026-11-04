/**
 * Margens e taxas: no backoffice escrevem-se em percentagem ("30", "12,5");
 * na BD guardam-se em fração com 4 casas (`numeric(5,4)`: "0.3000", "0.1250").
 * Conversão em texto, sem float.
 */
const PERCENT_INPUT = /^(\d{1,3})(?:[.,](\d{1,2}))?$/;

export type PercentParse = { ok: true; fraction: string } | { ok: false; message: string };

/** "30" → "0.3000"; "12,5" → "0.1250"; "0" → "0.0000". Até 999,99% e 2 casas. */
export function percentToFraction(input: string): PercentParse {
  const match = PERCENT_INPUT.exec(input.trim().replace(/\s*%$/, ""));
  if (!match) {
    return { ok: false, message: "Escreva uma percentagem entre 0 e 999,99, com até 2 casas" };
  }
  const [, intPart = "0", fracPart = ""] = match;
  // Percentagem com 2 casas = fração com 4 casas: os dígitos são os mesmos.
  const digits = (BigInt(intPart) * 100n + BigInt(fracPart.padEnd(2, "0"))).toString();
  const padded = digits.padStart(5, "0");
  return { ok: true, fraction: `${padded.slice(0, -4)}.${padded.slice(-4)}` };
}

/** "0.3000" → "30"; "0.1250" → "12,5" (formato pt-PT, sem zeros à direita). */
export function fractionToPercent(fraction: string): string {
  const match = /^(\d+)\.?(\d*)$/.exec(fraction);
  if (!match) throw new Error(`Fração inválida: "${fraction}"`);
  const [, intPart = "0", fracPart = ""] = match;
  const digits = BigInt(intPart + fracPart.padEnd(4, "0").slice(0, 4))
    .toString()
    .padStart(3, "0");
  const whole = digits.slice(0, -2).replace(/^0+(?=\d)/, "");
  const decimals = digits.slice(-2).replace(/0+$/, "");
  return decimals ? `${whole},${decimals}` : whole;
}
