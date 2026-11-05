/**
 * «Preço com margem» para mostrar ao lado do campo, enquanto se escreve.
 * É a mesma regra multiplicativa de lib/pricing (custo × (1 + margem)), em Decimal;
 * só mostra, não grava nada. Puro: serve no cliente e no servidor.
 */
import {
  add,
  decimalFromCents,
  formatDecimal,
  formatEuros,
  mul,
  ONE,
  parseDecimal,
  parseEuroInput,
  toCents,
} from "@/lib/money";
import { percentToFraction } from "@/lib/percent";

/** Fração da margem escrita no campo; null se estiver vazia ou inválida. */
function marginFraction(percentInput: string) {
  if (percentInput.trim() === "") return null;
  const parsed = percentToFraction(percentInput);
  return parsed.ok ? parseDecimal(parsed.fraction) : null;
}

const unitPrice = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
  useGrouping: "always",
});

/** Custo de um artigo do ERP (`numeric(12,4)` em texto), em euros com 2 a 4 casas. */
export function formatUnitCost(cost: string): string {
  return unitPrice.format(Number(formatDecimal(parseDecimal(cost))));
}

/**
 * Custo do ERP + margem, arredondado ao cêntimo como um preço normal («1,60 €»).
 * `exact` traz o valor com as casas do custo («1,595 €») só quando o arredondamento
 * o muda, para ir no title. null sem margem válida.
 */
export function materialPriceWithMargin(
  cost: string,
  percentInput: string,
): { price: string; exact: string | null } | null {
  const margin = marginFraction(percentInput);
  if (margin === null) return null;
  const value = mul(parseDecimal(cost), add(ONE, margin));
  const cents = toCents(value);
  const exact = unitPrice.format(Number(formatDecimal(value)));
  const price = formatEuros(cents);
  return { price, exact: decimalFromCents(cents) === value ? null : exact };
}

/** Custo por hora (texto em euros) + margem, em cêntimos. null se faltar algum dos dois. */
export function hourlyPriceCents(rateInput: string, percentInput: string): number | null {
  const rate = parseEuroInput(rateInput);
  const margin = marginFraction(percentInput);
  if (!rate.ok || margin === null) return null;
  return toCents(mul(decimalFromCents(rate.cents), add(ONE, margin)));
}
