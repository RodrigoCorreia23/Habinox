/**
 * Textos que o cliente vê e que se guardam na BD (nomes de produtos, opções,
 * valores…): um `jsonb` com uma entrada por língua. No beta só se preenche `pt`;
 * as outras línguas entram de uma vez na internacionalização.
 */
import { z } from "zod";

export const CONTENT_LOCALES = ["pt", "en", "de", "fr", "it", "es", "nl"] as const;
export type ContentLocale = (typeof CONTENT_LOCALES)[number];

export function isContentLocale(value: string): value is ContentLocale {
  return (CONTENT_LOCALES as readonly string[]).includes(value);
}

export type LocalizedText = { pt: string } & Partial<Record<ContentLocale, string>>;

export const localizedTextSchema = z
  .object({
    pt: z.string().trim().min(1),
    en: z.string().trim().min(1).optional(),
    de: z.string().trim().min(1).optional(),
    fr: z.string().trim().min(1).optional(),
    it: z.string().trim().min(1).optional(),
    es: z.string().trim().min(1).optional(),
    nl: z.string().trim().min(1).optional(),
  })
  .strict() satisfies z.ZodType<LocalizedText>;

/** Texto na língua pedida, com o português como reserva. */
export function localize(text: LocalizedText, locale: string): string {
  return (CONTENT_LOCALES as readonly string[]).includes(locale)
    ? (text[locale as ContentLocale] ?? text.pt)
    : text.pt;
}
