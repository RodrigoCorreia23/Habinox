import { cn } from "cn";

/** Painel branco com linha: o único contentor do backoffice. Nunca um painel dentro de outro. */
export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("bg-surface border-line rounded-[2px] border p-5", className)}>
      {children}
    </div>
  );
}

/**
 * Secção de uma página: h2 de 18px com a contagem ao lado e as ações à direita.
 * panel=true embrulha o conteúdo num Panel.
 */
export function Section({
  id,
  title,
  description,
  count,
  actions,
  panel = false,
  className,
  children,
}: {
  id?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  count?: number | string;
  actions?: React.ReactNode;
  panel?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const headingId = id ? `${id}-titulo` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn("scroll-mt-24 lg:scroll-mt-28", className)}
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 id={headingId} className="text-ink text-lg/[26px] font-semibold text-balance">
            {title}
            {count !== undefined && (
              <span className="text-steel ml-2 font-normal tabular-nums">{count}</span>
            )}
          </h2>
          {description && (
            <p className="text-steel mt-1 max-w-[68ch] text-[13px]/[18px]">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children !== undefined && (panel ? <Panel>{children}</Panel> : children)}
    </section>
  );
}
