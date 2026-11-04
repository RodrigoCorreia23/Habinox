import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { fontVariables } from "@/lib/fonts";
import "../globals.css";

/**
 * Antes de pintar, para a página inicial (só ela lê estes atributos):
 * - data-home="scrolly": com movimento permitido, a cena é conduzida pelo scroll;
 *   sem JavaScript ou com menos movimento pedido, fica uma página normal;
 * - data-route: "inicio" (apresentação, #inicio/#empresa/#servicos/#contactos)
 *   "entrar" (#entrar) ou "loja" (o resto). O site abre na loja, como no protótipo.
 */
const MOTION_SCRIPT = `(function(d){if(!matchMedia('(prefers-reduced-motion: reduce)').matches)d.dataset.home='scrolly';var h=location.hash.slice(1);d.dataset.route=h==='entrar'?'entrar':['inicio','empresa','servicos','contactos'].indexOf(h)>=0?'inicio':'loja'})(document.documentElement)`;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return { title: t("title"), description: t("description") };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    // suppressHydrationWarning: o script abaixo marca o <html> antes de o React hidratar.
    <html lang={locale} className={`${fontVariables} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
