import { cn } from "cn";
import { ChevronRight } from "lucide-react";

function Disclosure({
  title,
  children,
  className,
  open,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  open?: boolean;
}) {
  return (
    <details className={cn("group/disclosure", className)} open={open}>
      <summary className="text-amber-ink focus-visible:ring-amber-ink inline-flex cursor-pointer list-none items-center gap-1 rounded-[2px] text-sm outline-none select-none hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden
          className="size-4 transition-transform duration-150 group-open/disclosure:rotate-90"
          strokeWidth={1.75}
        />
        {title}
      </summary>
      <div className="bg-surface-alt/50 text-ink-soft mt-2 max-w-prose rounded-[2px] p-4 text-sm [&_p+p]:mt-2">
        {children}
      </div>
    </details>
  );
}

/** Explicação longa, fechada por defeito: «Como funciona?». */
export function Help({
  title = "Como funciona?",
  children,
  className,
  open,
}: {
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  open?: boolean;
}) {
  return (
    <Disclosure title={title} className={className} open={open}>
      {children}
    </Disclosure>
  );
}

/** Campos e detalhes que quase nunca se mexem (ex.: o nome usado nas fórmulas). */
export function Advanced({
  title = "Avançado",
  children,
  className,
  open,
}: {
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  open?: boolean;
}) {
  return (
    <Disclosure title={title} className={className} open={open}>
      {children}
    </Disclosure>
  );
}
