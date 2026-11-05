/** Textos curtos dos seletores de material e secção (servidor e cliente). */
import { formatEuros } from "@/lib/money";
import { fractionToPercent } from "@/lib/percent";

const costFormat = new Intl.NumberFormat("pt-PT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

function marginText(margin: string | null) {
  return margin === null ? "margem por decidir" : `margem ${fractionToPercent(margin)} %`;
}

/** «3,20 €/m · margem 30 %» (ou «margem por decidir»). */
export function articleHint(article: { cost: string; unit: string; margin: string | null }) {
  return `${costFormat.format(Number(article.cost))} €/${article.unit} · ${marginText(article.margin)}`;
}

export function sectorHint(sector: { hourlyRateCents: number; margin: string | null }) {
  return `${formatEuros(sector.hourlyRateCents)}/h · ${marginText(sector.margin)}`;
}
