import { formatDateTime, formatRelative } from "@/lib/format-date";
import { formatEuros } from "@/lib/money";

/** Dinheiro em Plex Sans com algarismos tabulares (nunca mono). */
export function Money({
  cents,
  className,
}: {
  cents: number | null | undefined;
  className?: string;
}) {
  if (cents === null || cents === undefined) return <Missing />;
  return <span className={`tabular-nums ${className ?? ""}`}>{formatEuros(cents)}</span>;
}

const numberFormat = new Intl.NumberFormat("pt-PT", {
  useGrouping: "always",
  maximumFractionDigits: 4,
});

/** Medida com a unidade em steel: «1 000 mm». */
export function Measure({
  value,
  unit,
  className,
}: {
  value: number | null | undefined;
  unit: string;
  className?: string;
}) {
  if (value === null || value === undefined || !Number.isFinite(value)) return <Missing />;
  return (
    <span className={`whitespace-nowrap tabular-nums ${className ?? ""}`}>
      {numberFormat.format(value)} <span className="text-steel">{unit}</span>
    </span>
  );
}

/** Data relativa («ontem às 20:46») com a data completa no title. */
export function RelativeTime({
  date,
  now,
  className,
}: {
  date: Date | string | null | undefined;
  now?: Date;
  className?: string;
}) {
  if (!date) return <Missing />;
  const value = date instanceof Date ? date : new Date(date);
  return (
    <time dateTime={value.toISOString()} title={formatDateTime(value)} className={className}>
      {formatRelative(value, now)}
    </time>
  );
}

/** Valor em falta: um travessão discreto, nunca uma célula vazia. */
export function Missing() {
  return (
    <span className="text-steel-light">
      <span aria-hidden>—</span>
      <span className="sr-only">sem valor</span>
    </span>
  );
}
