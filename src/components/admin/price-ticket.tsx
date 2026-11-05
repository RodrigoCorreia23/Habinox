import Link from "next/link";
import { cn } from "cn";
import { ChevronRight } from "lucide-react";
import { formatEuros } from "@/lib/money";

const percent = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 });

/** Taxa em fração («0.2300» ou 0.23) para texto «23 %». */
function ratePercent(rate: number | string) {
  return `${percent.format(Number(rate) * 100)} %`;
}

function Leader({
  label,
  detail,
  amount,
  href,
  strong,
}: {
  label: React.ReactNode;
  detail?: string;
  amount: string;
  href?: string;
  strong?: boolean;
}) {
  return (
    <div className={cn("flex items-end gap-2 text-sm", strong && "font-semibold")}>
      <span className="min-w-0">
        {href ? (
          <Link href={href} className="link-admin">
            {label}
          </Link>
        ) : (
          label
        )}
        {detail && (
          <span className="text-steel block text-[13px]/[18px] font-normal">{detail}</span>
        )}
      </span>
      <span aria-hidden className="border-line-strong mb-1 min-w-4 flex-1 border-b border-dotted" />
      <span className="shrink-0 tabular-nums">{amount}</span>
    </div>
  );
}

/**
 * O talão do preço, assinatura do backoffice: o preço na loja (com IVA) em grande,
 * a decomposição recolhida («Como se chega a este preço») e, à parte, o custo e a
 * margem que só a oficina vê. Todos os valores em cêntimos.
 */
export function PriceTicket({
  title = "Preço na loja",
  rows,
  totals,
  internal,
  note,
  open = false,
  size = "md",
  className,
}: {
  title?: React.ReactNode;
  rows: { label: React.ReactNode; detail?: string; amountCents: number; href?: string }[];
  /** vatRate em fração (0.23). */
  totals: { netCents: number; vatRate: number | string; totalCents: number };
  internal?: { costCents: number; marginCents: number };
  note?: React.ReactNode;
  open?: boolean;
  size?: "md" | "lg";
  className?: string;
}) {
  const marginShare =
    internal && totals.netCents > 0 ? (internal.marginCents / totals.netCents) * 100 : null;
  return (
    <div className={cn("bg-surface border-line rounded-[2px] border p-5", className)}>
      <p className="text-ink text-sm font-medium">{title}</p>
      <p
        className={cn(
          "text-ink mt-1 font-semibold tabular-nums",
          size === "lg" ? "text-[32px]/10" : "text-[28px]/9",
        )}
      >
        {formatEuros(totals.totalCents)}
      </p>
      <p className="text-steel text-[13px]/[18px]">
        com IVA ({ratePercent(totals.vatRate)}) ·{" "}
        <span className="tabular-nums">{formatEuros(totals.netCents)}</span> sem IVA
      </p>

      {rows.length > 0 && (
        <details className="group/ticket mt-4" open={open}>
          <summary className="text-amber-ink focus-visible:ring-amber-ink inline-flex cursor-pointer list-none items-center gap-1 rounded-[2px] text-sm outline-none select-none hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
            <ChevronRight
              aria-hidden
              className="size-4 transition-transform duration-150 group-open/ticket:rotate-90"
              strokeWidth={1.75}
            />
            Como se chega a este preço
          </summary>
          <div className="mt-3 grid gap-2">
            {rows.map((row, index) => (
              <Leader
                key={index}
                label={row.label}
                detail={row.detail}
                amount={formatEuros(row.amountCents)}
                href={row.href}
              />
            ))}
            <div className="border-line-strong mt-1 grid gap-2 border-t pt-3">
              <Leader label="Sem IVA" amount={formatEuros(totals.netCents)} />
              <Leader
                label={`IVA (${ratePercent(totals.vatRate)})`}
                amount={formatEuros(totals.totalCents - totals.netCents)}
              />
              <Leader label="Preço na loja" amount={formatEuros(totals.totalCents)} strong />
            </div>
          </div>
        </details>
      )}

      {internal && (
        <div className="bg-surface-alt mt-4 grid gap-2 rounded-[2px] p-3">
          <p className="text-steel text-xs">Só para si, o cliente não vê</p>
          <Leader label="Custo estimado" amount={formatEuros(internal.costCents)} />
          <Leader
            label="Margem bruta"
            detail={
              marginShare === null ? undefined : `${percent.format(marginShare)} % do preço sem IVA`
            }
            amount={formatEuros(internal.marginCents)}
          />
        </div>
      )}

      {note && <div className="text-steel mt-3 text-[13px]/[18px]">{note}</div>}
    </div>
  );
}
