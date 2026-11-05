/**
 * Valores próprios de um produto (custo e margem de um material ou de um
 * sector), por cima dos gerais. Puro e testado: é por aqui que passa cada
 * custo e cada margem que um produto usa.
 *
 * - Sem valor próprio, fica o geral (custo do ERP / custo-hora e margem gerais).
 * - Um custo próprio é fixo: não segue o ERP. Quando o ERP muda, `isStale`
 *   diz que o custo fixado ficou diferente do de agora (aviso ao Bruno).
 */
import type { Decimal } from "@/lib/money";
import type { PricedItem } from "./calculate";

export interface CostOverride {
  /** Custo por unidade (material) ou por hora (sector); null = o geral. */
  unitCost: Decimal | null;
  /** Fração; null = a geral. */
  margin: Decimal | null;
}

export function applyOverride(item: PricedItem, override: CostOverride | undefined): PricedItem {
  const cost = override?.unitCost ?? null;
  const margin = override?.margin ?? null;
  return {
    ...item,
    unitCost: cost ?? item.unitCost,
    margin: margin ?? item.margin,
    source: {
      cost: cost === null ? "general" : "product",
      margin: margin === null ? "general" : "product",
    },
  };
}

/**
 * O custo fixado num produto ficou desatualizado: o ERP já não tem o custo que
 * tinha quando o Bruno o fixou. (Um custo fixado igual ao do ERP de agora não avisa.)
 */
export function isStale(
  override: { unitCost: Decimal | null; referenceCost: Decimal | null },
  currentErpCost: Decimal,
): boolean {
  if (override.unitCost === null || override.referenceCost === null) return false;
  return override.referenceCost !== currentErpCost;
}
