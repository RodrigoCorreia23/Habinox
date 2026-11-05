"use client";

/**
 * «Custos deste produto»: cada material e sector que a fórmula usa, com o valor
 * geral e, se o Bruno quiser, um custo e uma margem só deste produto. Campo
 * vazio = usa o geral. Guarda ao sair do campo (como as margens em Materiais).
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { centsToEuroInput, costToInput } from "@/lib/money";
import { fractionToPercent } from "@/lib/percent";
import type { CostItem } from "@/server/catalog/cost-overrides";
import { InlineField, type InlineStatus, InlineStatusText } from "../../materiais/inline-field";
import { setCostOverrideAction } from "../cost-actions";

function generalCostText(item: CostItem) {
  if (item.kind === "sector") return `${centsToEuroInput(item.general.hourlyRateCents ?? 0)} €/h`;
  return `${costToInput(item.general.unitCost ?? "0")} €/${item.unit}`;
}

function generalMarginText(item: CostItem) {
  return item.general.margin === null
    ? "por decidir"
    : `${fractionToPercent(item.general.margin)} %`;
}

function ownCostInput(item: CostItem) {
  if (!item.own) return "";
  if (item.kind === "sector")
    return item.own.hourlyRateCents === null ? "" : centsToEuroInput(item.own.hourlyRateCents);
  return item.own.unitCost === null ? "" : costToInput(item.own.unitCost);
}

function ownMarginInput(item: CostItem) {
  return item.own?.margin ? fractionToPercent(item.own.margin) : "";
}

/** Campo em linha a ocupar a coluna, com «A guardar… / Guardado ✓» por baixo. */
function CostField(
  props: Omit<React.ComponentProps<typeof InlineField>, "statusPlacement" | "onStatus">,
) {
  const [status, setStatus] = useState<InlineStatus>("idle");
  return (
    <>
      <InlineField {...props} statusPlacement="none" onStatus={setStatus} className="w-full" />
      <InlineStatusText status={status} />
    </>
  );
}

export function CostTable({
  productId,
  versionId,
  items,
}: {
  productId: string;
  /** Versão em preparação; null = só leitura (a versão na loja não se muda). */
  versionId: string | null;
  items: CostItem[];
}) {
  const router = useRouter();
  const editable = versionId !== null;

  return (
    <ul className="border-line bg-surface divide-line-soft divide-y border">
      {items.map((item) => {
        const ownCost = ownCostInput(item);
        const ownMargin = ownMarginInput(item);
        const commit = (field: "cost" | "margin") => async (value: string) => {
          const result = await setCostOverrideAction(
            productId,
            versionId!,
            item.kind,
            item.id,
            field,
            value,
          );
          if (result.ok) router.refresh();
          return result;
        };
        return (
          <li
            key={`${item.kind}-${item.id}`}
            className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_12rem_10rem] md:items-start md:gap-4"
          >
            <div className="min-w-0">
              <p className="text-ink font-medium">{item.name}</p>
              <p className="text-steel text-[13px]">
                {item.kind === "sector"
                  ? "Mão de obra, por hora"
                  : `${item.code} · por ${item.unit}`}
              </p>
              {(ownCost || ownMargin) && (
                <p className="mt-1 flex flex-wrap gap-1.5">
                  {ownCost && <StatusBadge tone="info">Custo deste produto</StatusBadge>}
                  {ownMargin && <StatusBadge tone="info">Margem deste produto</StatusBadge>}
                </p>
              )}
              {item.stale && item.own?.unitCost && (
                <p className="text-warn mt-1.5 flex gap-1.5 text-[13px]">
                  <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    O Odoo mudou o custo para {costToInput(item.general.unitCost ?? "0")} € por{" "}
                    {item.unit}; este produto continua com o custo fixado de{" "}
                    {costToInput(item.own.unitCost)} €.
                  </span>
                </p>
              )}
            </div>

            <div>
              <span className="text-steel mb-1 block text-[13px]">
                {item.kind === "sector" ? "Custo por hora" : "Custo"}
              </span>
              {editable ? (
                <CostField
                  name="cost"
                  unit={item.kind === "sector" ? "€/h" : "€"}
                  value={ownCost}
                  placeholder={generalCostText(item).replace(/ €.*$/, "")}
                  label={`Custo de ${item.name} neste produto (vazio = geral, ${generalCostText(item)})`}
                  commit={commit("cost")}
                />
              ) : (
                <p className="tabular-nums">{ownCost ? `${ownCost} €` : generalCostText(item)}</p>
              )}
              <span className="text-steel mt-1 block text-xs">Geral: {generalCostText(item)}</span>
            </div>

            <div>
              <span className="text-steel mb-1 block text-[13px]">Margem</span>
              {editable ? (
                <CostField
                  name="margin"
                  unit="%"
                  value={ownMargin}
                  placeholder={
                    item.general.margin === null ? "—" : fractionToPercent(item.general.margin)
                  }
                  label={`Margem de ${item.name} neste produto (vazio = geral, ${generalMarginText(item)})`}
                  commit={commit("margin")}
                />
              ) : (
                <p className="tabular-nums">
                  {ownMargin ? `${ownMargin} %` : generalMarginText(item)}
                </p>
              )}
              <span className="text-steel mt-1 block text-xs">
                Geral: {generalMarginText(item)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
