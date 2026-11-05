import Link from "next/link";
import { cn } from "cn";

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right";
  className?: string;
  /** A célula com a ligação da linha (texto principal). */
  primary?: boolean;
  /** Lugar no cartão abaixo de md. Por defeito: primary → title, direita → aside, resto → meta. */
  mobile?: "title" | "meta" | "aside" | "hidden";
};

function placeOf<T>(column: Column<T>) {
  return column.mobile ?? (column.primary ? "title" : column.align === "right" ? "aside" : "meta");
}

// Controlos dentro de uma linha clicável ficam por cima da ligação que a cobre.
const ABOVE_ROW_LINK = "[&_a]:relative [&_a]:z-10 [&_button]:relative [&_button]:z-10";

/**
 * Tabela do backoffice: <table> semântica dentro de um painel, sem zebra nem
 * faixa no cabeçalho. Com rowHref, a linha inteira abre o item. Abaixo de md passa
 * a uma lista de cartões com a mesma ligação.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowHref,
  empty,
  caption,
  summary,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  empty: React.ReactNode;
  caption: string;
  summary?: React.ReactNode;
  className?: string;
}) {
  if (rows.length === 0) return <>{empty}</>;
  const primary = columns.find((column) => column.primary) ?? columns[0]!;

  const primaryCell = (row: T, card = false) => {
    const content = primary.cell(row);
    if (!rowHref) return content;
    return (
      <Link
        href={rowHref(row)}
        data-row-link
        className={cn(
          "text-ink font-medium outline-none after:absolute after:inset-0 hover:underline hover:underline-offset-4",
          card && "after:z-0",
        )}
      >
        {content}
      </Link>
    );
  };

  return (
    <div className={className}>
      {summary && <p className="text-steel mb-2 text-[13px] tabular-nums">{summary}</p>}

      {/* Desktop e tablet */}
      <div className="bg-surface border-line hidden overflow-x-auto rounded-[2px] border md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-line border-b">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "text-steel h-10 px-4 text-xs font-medium whitespace-nowrap",
                    column.align === "right" ? "text-right" : "text-left",
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={cn(
                  "border-line-soft border-b last:border-b-0",
                  rowHref &&
                    "hover:bg-surface-alt/60 has-[a[data-row-link]:focus-visible]:outline-amber-ink relative cursor-pointer has-[a[data-row-link]:focus-visible]:outline-2 has-[a[data-row-link]:focus-visible]:-outline-offset-2",
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "h-12 px-4 py-3 align-middle",
                      column.align === "right" && "text-right tabular-nums",
                      column !== primary && rowHref && ABOVE_ROW_LINK,
                      column.className,
                    )}
                  >
                    {column === primary ? primaryCell(row) : column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Telemóvel: cartões */}
      <ul
        aria-label={caption}
        className="bg-surface border-line divide-line-soft divide-y rounded-[2px] border md:hidden"
      >
        {rows.map((row) => {
          const byPlace = (place: ReturnType<typeof placeOf>) =>
            columns.filter((column) => column !== primary && placeOf(column) === place);
          const titles = byPlace("title");
          const metas = byPlace("meta");
          const asides = byPlace("aside");
          return (
            <li
              key={rowKey(row)}
              className={cn(
                "relative flex min-h-12 items-start gap-3 px-4 py-3",
                rowHref &&
                  "active:bg-surface-alt/60 has-[a[data-row-link]:focus-visible]:outline-amber-ink has-[a[data-row-link]:focus-visible]:outline-2 has-[a[data-row-link]:focus-visible]:-outline-offset-2",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm">{primaryCell(row, true)}</span>
                  {titles.map((column) => (
                    <span key={column.key} className={rowHref ? ABOVE_ROW_LINK : undefined}>
                      {column.cell(row)}
                    </span>
                  ))}
                </div>
                {metas.length > 0 && (
                  <div
                    className={cn(
                      "text-steel mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px]",
                      rowHref && ABOVE_ROW_LINK,
                    )}
                  >
                    {metas.map((column) => (
                      <span key={column.key}>{column.cell(row)}</span>
                    ))}
                  </div>
                )}
              </div>
              {asides.length > 0 && (
                <div
                  className={cn(
                    "grid shrink-0 justify-items-end gap-1 text-right text-sm tabular-nums",
                    rowHref && ABOVE_ROW_LINK,
                  )}
                >
                  {asides.map((column) => (
                    <span key={column.key}>{column.cell(row)}</span>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
