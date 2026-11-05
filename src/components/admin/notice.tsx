import { cn } from "cn";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";

const TONES = {
  info: { box: "border-info-line bg-info-bg", icon: Info, iconClass: "text-info" },
  ok: { box: "border-ok-line bg-ok-bg", icon: CircleCheck, iconClass: "text-ok" },
  warn: { box: "border-warn-line bg-warn-bg", icon: TriangleAlert, iconClass: "text-warn" },
  danger: { box: "border-danger-line bg-danger-bg", icon: CircleAlert, iconClass: "text-danger" },
} as const;

/**
 * Aviso em faixa: o que se passa e a saída. role=alert só no tom danger.
 * Sem borda esquerda grossa (DESIGN.md › Backoffice).
 */
export function Notice({
  tone,
  title,
  children,
  action,
  className,
}: {
  tone: keyof typeof TONES;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const { box, icon: Icon, iconClass } = TONES[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex flex-wrap items-start gap-x-3 gap-y-2 rounded-[2px] border px-4 py-3 sm:flex-nowrap",
        box,
        className,
      )}
    >
      <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", iconClass)} strokeWidth={1.75} />
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className="text-ink font-semibold">{title}</p>}
        {children && <div className={cn("text-ink-soft", title && "mt-0.5")}>{children}</div>}
      </div>
      {action && <div className="shrink-0 max-sm:basis-full max-sm:pl-7">{action}</div>}
    </div>
  );
}
