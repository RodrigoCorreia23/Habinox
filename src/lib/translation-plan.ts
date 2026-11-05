/**
 * O que traduzir automaticamente (puro, testado). Para cada texto do catálogo e
 * cada língua, compara o português de agora com o estado guardado:
 *
 * - sem tradução e sem estado → traduzir;
 * - tradução automática feita a partir de outro português → traduzir de novo;
 * - tradução revista à mão → nunca se toca (se o português mudou, fica a rever);
 * - tradução que já existia sem estado (escrita antes disto) → conta como revista.
 */
import { createHash } from "node:crypto";

export function sourceHash(text: string): string {
  return createHash("sha256").update(text.normalize("NFC")).digest("hex").slice(0, 32);
}

export interface PlanRow {
  field: string;
  id: string;
  pt: string;
  /** Tradução atual em cada língua (null = falta). */
  values: Record<string, string | null>;
}

export interface PlanState {
  field: string;
  rowId: string;
  locale: string;
  sourceHash: string;
  origin: "auto" | "manual";
}

export interface TranslationPlan {
  /** Textos a traduzir e para que línguas. */
  translate: { field: string; id: string; pt: string; locales: string[] }[];
  /** Traduções antigas sem estado: passam a "revistas", com o português de agora. */
  adopt: { field: string; id: string; locale: string; hash: string }[];
}

export type TranslationStatus = "missing" | "auto" | "manual" | "stale";

/** Estado de uma tradução para mostrar no backoffice. */
export function translationStatus(
  pt: string,
  value: string | null,
  state: Pick<PlanState, "sourceHash" | "origin"> | undefined,
): TranslationStatus {
  if (!value) return "missing";
  if (!state) return "manual";
  if (state.origin === "auto") return state.sourceHash === sourceHash(pt) ? "auto" : "stale";
  return state.sourceHash === sourceHash(pt) ? "manual" : "stale";
}

export function planTranslations(
  rows: readonly PlanRow[],
  states: readonly PlanState[],
  locales: readonly string[],
): TranslationPlan {
  const byKey = new Map(states.map((s) => [`${s.field}|${s.rowId}|${s.locale}`, s]));
  const plan: TranslationPlan = { translate: [], adopt: [] };
  for (const row of rows) {
    if (row.pt.trim() === "") continue;
    const hash = sourceHash(row.pt);
    const needed: string[] = [];
    for (const locale of locales) {
      const state = byKey.get(`${row.field}|${row.id}|${locale}`);
      const value = row.values[locale] ?? null;
      if (!state) {
        if (value) plan.adopt.push({ field: row.field, id: row.id, locale, hash });
        else needed.push(locale);
      } else if (state.origin === "auto" && (state.sourceHash !== hash || !value)) {
        needed.push(locale);
      }
    }
    if (needed.length)
      plan.translate.push({ field: row.field, id: row.id, pt: row.pt, locales: needed });
  }
  return plan;
}
