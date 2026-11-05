import Link from "next/link";
import { Search } from "lucide-react";
import { fieldClass } from "./field";

/**
 * Pesquisa por GET (o termo fica na URL). hidden mantém os filtros ativos.
 * Com termo, mostra «N resultados para «x»» e a ligação «Limpar».
 */
export function SearchBox({
  name = "q",
  defaultValue,
  placeholder,
  label = "Pesquisar",
  resultSummary,
  clearHref,
  hidden,
  action,
}: {
  name?: string;
  defaultValue?: string;
  placeholder: string;
  label?: string;
  resultSummary?: string;
  clearHref?: string;
  hidden?: Record<string, string | undefined>;
  action?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <form role="search" method="get" action={action} className="relative w-full sm:w-80">
        {Object.entries(hidden ?? {}).map(([key, value]) =>
          value ? <input key={key} type="hidden" name={key} value={value} /> : null,
        )}
        <Search
          aria-hidden
          className="text-steel pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          strokeWidth={1.75}
        />
        <input
          type="search"
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          aria-label={label}
          className={`${fieldClass} placeholder:text-steel-light w-full pl-9`}
        />
      </form>
      {defaultValue && (resultSummary || clearHref) && (
        <p
          className="text-steel flex flex-wrap items-center gap-x-3 text-[13px]"
          aria-live="polite"
        >
          {resultSummary && <span className="tabular-nums">{resultSummary}</span>}
          {clearHref && (
            <Link href={clearHref} className="link-admin">
              Limpar
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
