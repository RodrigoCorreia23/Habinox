"use client";

/**
 * Seletor de línguas: a mesma página noutra língua. Só aparece com mais de uma
 * língua visível (NEXT_PUBLIC_LOCALES). Códigos curtos em mono, como as outras
 * etiquetas da loja; o nome completo fica para leitores de ecrã e no `title`.
 */
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { LOCALE_NAMES } from "@/i18n/locales";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import type { ContentLocale } from "@/lib/localized";

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("Shop");
  const current = useLocale();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  if (routing.locales.length < 2) return null;
  return (
    <nav aria-label={t("language")} className={className}>
      <ul className="flex flex-wrap gap-x-1 gap-y-1 font-mono text-xs">
        {routing.locales.map((locale) => {
          const name = LOCALE_NAMES[locale as ContentLocale];
          const active = locale === current;
          return (
            <li key={locale}>
              <Link
                href={search ? `${pathname}?${search}` : pathname}
                locale={locale}
                lang={locale}
                hrefLang={locale}
                title={name}
                aria-label={name}
                aria-current={active ? "true" : undefined}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center uppercase tracking-[0.08em] underline-offset-4 ${
                  active ? "text-night-text underline decoration-amber" : "hover:text-amber"
                }`}
              >
                {locale}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
