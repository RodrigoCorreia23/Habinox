/**
 * Exemplo de preço para a página Parâmetros: um produto publicado numa
 * configuração média (meio do intervalo de cada medida, arredondado ao passo,
 * ou o valor que vem escolhido), calculado com o mesmo motor da loja.
 * Serve para mostrar o efeito de mudar o IVA antes de o confirmar. Só leituras.
 */
import { and, asc, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { products } from "@/db/schema";
import { resolveConfig } from "@/lib/options";
import { calculatePrice } from "@/lib/pricing";
import { loadPricingModel, type PricingModel } from "@/server/catalog/formula";

export type PriceExample = {
  /** «Portão de correr 2 000 × 1 500 mm» */
  label: string;
  /** Preço sem IVA, em cêntimos. */
  netCents: number;
};

/** Quantos produtos publicados se experimentam até um dar preço. */
const CANDIDATES = 5;

const millimetres = new Intl.NumberFormat("pt-PT", { useGrouping: "always" });

function middle(min: number, max: number, step: number | null): number {
  const mid = (min + max) / 2;
  if (!step || step <= 0) return Math.round(mid);
  return min + Math.round((mid - min) / step) * step;
}

/** Configuração média de um produto: o que o Bruno reconhece como «um portão normal». */
function averageInput(model: PricingModel): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  model.input.options.forEach((option, index) => {
    const meta = model.meta[index];
    const preset = meta?.defaultValue;
    switch (option.type) {
      case "dimension":
      case "number":
        if (typeof preset === "number") input[option.key] = preset;
        else if (option.min != null && option.max != null) {
          input[option.key] = middle(option.min, option.max, option.step ?? null);
        } else if (option.min != null) input[option.key] = option.min;
        break;
      case "choice": {
        const chosen = meta?.values.find((value) => value.isDefault) ?? meta?.values[0];
        if (typeof preset === "string") input[option.key] = preset;
        else if (chosen) input[option.key] = chosen.key;
        break;
      }
      case "boolean":
        input[option.key] = preset === true;
        break;
    }
  });
  return input;
}

export async function priceExample(): Promise<PriceExample | null> {
  const candidates = await db
    .select({ name: products.name, versionId: products.publishedVersionId })
    .from(products)
    .where(and(isNull(products.archivedAt), isNotNull(products.publishedVersionId)))
    .orderBy(asc(products.createdAt))
    .limit(CANDIDATES);

  for (const candidate of candidates) {
    if (!candidate.versionId) continue;
    const model = await loadPricingModel(candidate.versionId);
    if (!model) continue;
    const config = resolveConfig(model.input.options, model.rules, averageInput(model));
    if (config.errors.length > 0) continue;
    const result = calculatePrice({ ...model.input, values: config.values });
    if (!result.ok) continue;

    // Medidas em mm, pela ordem do produto: «2 000 × 1 500 mm».
    const sizes = model.input.options
      .filter((option) => option.type === "dimension")
      .map((option) => config.values[option.key])
      .filter((value): value is number => typeof value === "number")
      .map((value) => millimetres.format(value));
    const label = sizes.length ? `${candidate.name.pt} ${sizes.join(" × ")} mm` : candidate.name.pt;
    return { label, netCents: result.netCents };
  }
  return null;
}
