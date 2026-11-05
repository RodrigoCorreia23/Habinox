/**
 * Línguas da loja. Todas têm tradução (messages/<língua>.json); quais ficam
 * visíveis decide-o NEXT_PUBLIC_LOCALES (ex.: "pt,en,es"), lida no build.
 * Sem a variável, só PT: o lançamento é em português e as outras línguas
 * abrem quando o Bruno aprovar as traduções.
 */
import { CONTENT_LOCALES, type ContentLocale } from "@/lib/localized";

export const DEFAULT_LOCALE = "pt" satisfies ContentLocale;

/** Lê a lista da variável; ignora línguas desconhecidas; PT está sempre e vem primeiro. */
export function parseEnabledLocales(raw: string | undefined): ContentLocale[] {
  const wanted = (raw ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is ContentLocale =>
      (CONTENT_LOCALES as readonly string[]).includes(value),
    );
  return [
    DEFAULT_LOCALE,
    ...CONTENT_LOCALES.filter((l) => l !== DEFAULT_LOCALE && wanted.includes(l)),
  ];
}

/** Nome de cada língua na própria língua (para o seletor). */
export const LOCALE_NAMES: Record<ContentLocale, string> = {
  pt: "Português",
  en: "English",
  de: "Deutsch",
  fr: "Français",
  it: "Italiano",
  es: "Español",
  nl: "Nederlands",
};

/** Língua para Intl (datas, números, moeda): o português é o de Portugal. */
export function intlLocale(locale: string): string {
  const map: Record<string, string> = {
    pt: "pt-PT",
    en: "en-GB",
    de: "de-DE",
    fr: "fr-FR",
    it: "it-IT",
    es: "es-ES",
    nl: "nl-NL",
  };
  return map[locale] ?? "pt-PT";
}
