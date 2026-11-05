import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, parseEnabledLocales } from "./locales";

// Línguas visíveis: NEXT_PUBLIC_LOCALES (ver locales.ts). Por omissão, só PT.
export const routing = defineRouting({
  locales: parseEnabledLocales(process.env.NEXT_PUBLIC_LOCALES),
  defaultLocale: DEFAULT_LOCALE,
});
