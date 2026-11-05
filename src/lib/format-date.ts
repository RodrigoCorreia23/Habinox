/**
 * Datas do backoffice, sempre no fuso de Lisboa e em pt-PT (DESIGN.md › Backoffice).
 * Puro: recebe as datas (e o "agora") e devolve texto. Nunca o ano com 2 dígitos.
 *
 *   formatDate       «5 nov 2026»
 *   formatDateTime   «5 nov 2026, 10:53»
 *   formatRelative   «agora», «há 12 min», «há 2 h», «hoje às 14:20»,
 *                    «ontem às 20:46», «há 3 dias» (até 6 dias), depois formatDate
 */

const TIME_ZONE = "Europe/Lisbon";
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const partsFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

type Parts = { year: number; month: number; day: number; hour: string; minute: string };

function lisbonParts(date: Date): Parts {
  const parts = Object.fromEntries(
    partsFormat.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: parts.hour!.padStart(2, "0"),
    minute: parts.minute!.padStart(2, "0"),
  };
}

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Número do dia civil (em Lisboa), para contar «ontem» e «há 3 dias» sem horas de verão. */
function dayNumber(parts: Parts): number {
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000);
}

const time = (parts: Parts) => `${parts.hour}:${parts.minute}`;

export function formatDate(value: Date | string | number): string {
  const parts = lisbonParts(toDate(value));
  return `${parts.day} ${MONTHS[parts.month - 1]} ${parts.year}`;
}

export function formatDateTime(value: Date | string | number): string {
  const parts = lisbonParts(toDate(value));
  return `${parts.day} ${MONTHS[parts.month - 1]} ${parts.year}, ${time(parts)}`;
}

/** Hora de Lisboa, «14:20». */
export function formatTime(value: Date | string | number): string {
  return time(lisbonParts(toDate(value)));
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export function formatRelative(value: Date | string | number, now: Date = new Date()): string {
  const date = toDate(value);
  const diff = now.getTime() - date.getTime();
  // No futuro (relógios desacertados ou datas marcadas): a data completa, sem adivinhar.
  if (diff < -MINUTE) return formatDateTime(date);
  if (diff < MINUTE) return "agora";
  if (diff < HOUR) return `há ${Math.floor(diff / MINUTE)} min`;

  const parts = lisbonParts(date);
  const days = dayNumber(lisbonParts(now)) - dayNumber(parts);
  if (diff < 3 * HOUR && days === 0) return `há ${Math.floor(diff / HOUR)} h`;
  if (days === 0) return `hoje às ${time(parts)}`;
  if (days === 1) return `ontem às ${time(parts)}`;
  if (days <= 6) return `há ${days} dias`;
  return formatDate(date);
}
