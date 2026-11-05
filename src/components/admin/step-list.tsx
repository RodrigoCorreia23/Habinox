import Link from "next/link";
import { cn } from "cn";
import { Check } from "lucide-react";

export type StepStatus = "done" | "current" | "todo" | "problem";
export type Step = { title: string; status: StepStatus; detail?: string; href?: string };

const STATUS_TEXT: Record<StepStatus, string> = {
  done: "feito",
  current: "a seguir",
  todo: "por fazer",
  problem: "tem problemas",
};

function Marker({ status, index }: { status: StepStatus; index: number }) {
  const base =
    "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] leading-none font-semibold tabular-nums";
  if (status === "done")
    return (
      <span aria-hidden className={cn(base, "bg-ink text-white")}>
        <Check className="size-3" strokeWidth={2.5} />
      </span>
    );
  if (status === "problem")
    return (
      <span aria-hidden className={cn(base, "bg-danger-bg text-danger ring-danger-line ring-1")}>
        !
      </span>
    );
  return (
    <span
      aria-hidden
      className={cn(
        base,
        status === "current"
          ? "ring-amber-ink text-amber-ink ring-2 ring-inset"
          : "ring-line-strong text-steel ring-1 ring-inset",
      )}
    >
      {index + 1}
    </span>
  );
}

/**
 * Passos com estado (lista ordenada verdadeira): «Montar a loja» no painel e a
 * sub-navegação do editor de produto (orientation="horizontal").
 */
export function StepList({
  label,
  steps,
  orientation = "vertical",
  currentLabel,
  className,
}: {
  label: string;
  steps: Step[];
  orientation?: "vertical" | "horizontal";
  /** Como o leitor de ecrã anuncia o passo atual: «a seguir» (tarefas) ou «atual» (estados). */
  currentLabel?: string;
  className?: string;
}) {
  const horizontal = orientation === "horizontal";
  return (
    <ol
      aria-label={label}
      className={cn(
        horizontal
          ? "flex items-center gap-x-6 overflow-x-auto whitespace-nowrap [scrollbar-width:thin]"
          : "grid gap-3",
        className,
      )}
    >
      {steps.map((step, index) => {
        const title = step.href ? (
          <Link
            href={step.href}
            className="hover:text-amber-ink focus-visible:ring-amber-ink rounded-[2px] outline-none hover:underline hover:underline-offset-4 focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            {step.title}
          </Link>
        ) : (
          step.title
        );
        return (
          <li
            key={`${index}-${step.title}`}
            aria-current={step.status === "current" ? "step" : undefined}
            className={cn("flex gap-2.5", horizontal ? "items-center py-2" : "items-start")}
          >
            <Marker status={step.status} index={index} />
            <span className={cn("min-w-0", horizontal && "flex items-baseline gap-1.5")}>
              <span
                className={cn(
                  "block text-sm font-medium",
                  step.status === "todo" ? "text-ink-soft" : "text-ink",
                  horizontal && "inline",
                )}
              >
                {title}
                <span className="sr-only">
                  {" "}
                  (
                  {step.status === "current" && currentLabel
                    ? currentLabel
                    : STATUS_TEXT[step.status]}
                  )
                </span>
              </span>
              {step.detail && (
                <span
                  className={cn(
                    "text-[13px]/[18px]",
                    step.status === "problem" ? "text-danger" : "text-steel",
                    horizontal ? "inline tabular-nums" : "mt-0.5 block",
                  )}
                >
                  {step.detail}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
