import Link from "next/link";
import { cn } from "cn";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { FlashSlot } from "./flash";
import { Help } from "./help";
import { StickyHeader } from "./sticky-header";

export type Crumb = { href: string; label: string };

function Crumbs({ crumbs }: { crumbs: Crumb[] }) {
  const last = crumbs[crumbs.length - 1]!;
  const linkClass =
    "hover:text-ink focus-visible:ring-amber-ink rounded-[2px] outline-none hover:underline hover:underline-offset-4 focus-visible:ring-2";
  return (
    <nav aria-label="Caminho" className="text-steel mb-2 text-[13px]/[18px]">
      {/* Telemóvel: só o nível de cima. */}
      <Link href={last.href} className={cn("inline-flex items-center gap-1 sm:hidden", linkClass)}>
        <ArrowLeft aria-hidden className="size-3.5" strokeWidth={1.75} />
        {last.label}
      </Link>
      <ol className="hidden flex-wrap items-center gap-1 sm:flex">
        {crumbs.map((crumb, index) => (
          <li key={crumb.href} className="inline-flex items-center gap-1">
            {index > 0 && <ChevronRight aria-hidden className="size-3.5" strokeWidth={1.75} />}
            <Link href={crumb.href} className={linkClass}>
              {crumb.label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Cabeçalho de cada página: migalhas, título (Archivo, o parentesco com a loja),
 * estado, ações à direita, uma frase de descrição, a ajuda recolhida e metadados.
 * Inclui o FlashSlot (mensagens deixadas por actions que fazem redirect).
 */
export function PageHeader({
  crumbs,
  title,
  status,
  description,
  help,
  actions,
  meta,
  sticky = false,
  leading,
  className,
}: {
  crumbs?: Crumb[];
  title: React.ReactNode;
  status?: React.ReactNode;
  description?: React.ReactNode;
  help?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  sticky?: boolean;
  /** Antes do título (ex.: a miniatura do produto). */
  leading?: React.ReactNode;
  className?: string;
}) {
  const content = (
    <>
      {crumbs && crumbs.length > 0 && <Crumbs crumbs={crumbs} />}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex min-w-0 items-start gap-4">
          {leading}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="font-heading text-ink line-clamp-2 text-2xl/8 font-semibold tracking-[-0.01em] text-balance [font-stretch:115%]">
                {title}
              </h1>
              {status}
            </div>
            {description && <p className="text-steel mt-1.5 max-w-[68ch] text-sm">{description}</p>}
            {meta && <p className="text-steel-light mt-1 text-xs">{meta}</p>}
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 max-sm:[&>*]:flex-1">
            {actions}
          </div>
        )}
      </div>
      {help && <Help className="mt-3">{help}</Help>}
      <FlashSlot />
    </>
  );

  if (sticky) return <StickyHeader className={cn("mb-8", className)}>{content}</StickyHeader>;
  return <header className={cn("mb-8", className)}>{content}</header>;
}
