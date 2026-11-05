import { cn } from "cn";
import type { OrderStatus } from "@/lib/orders/state";
import { ORDER_STATUS, type StatusTone, VERSION_STATUS, type VersionStatus } from "./status";

const TONES: Record<StatusTone, string> = {
  ok: "border-ok-line bg-ok-bg text-ok",
  warn: "border-warn-line bg-warn-bg text-warn",
  danger: "border-danger-line bg-danger-bg text-danger",
  info: "border-info-line bg-info-bg text-info",
  quiet: "border-quiet-line bg-quiet-bg text-quiet",
  draft: "border-dashed border-line-strong bg-transparent text-ink-soft",
};

/**
 * Etiqueta de estado: o texto diz sempre o estado (nunca só cor), com um ponto
 * de 6px na cor do texto. Uma só etiqueta por linha.
 */
export function StatusBadge({
  tone,
  children,
  title,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-[2px] border px-2 text-xs font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const info = ORDER_STATUS[status];
  return <StatusBadge tone={info.tone}>{info.label}</StatusBadge>;
}

export function VersionStatusBadge({ status }: { status: VersionStatus }) {
  const info = VERSION_STATUS[status];
  return <StatusBadge tone={info.tone}>{info.label}</StatusBadge>;
}
