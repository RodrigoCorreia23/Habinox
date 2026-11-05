import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/shop/legal-page";
import { getLegalDocument } from "@/content/legal";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/cookies">): Promise<Metadata> {
  const { locale } = await params;
  return { title: `${getLegalDocument("cookies", locale).title} · Habinox` };
}

export default async function Page({ params }: PageProps<"/[locale]/cookies">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Shop.legal");
  const document = getLegalDocument("cookies", locale);
  return (
    <LegalPage
      document={document}
      updatedLabel={t("updated", { date: document.updated })}
      portugueseOnly={locale !== "pt" ? t("portugueseOnly") : undefined}
    />
  );
}
