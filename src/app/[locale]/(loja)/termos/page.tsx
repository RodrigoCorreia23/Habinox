import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/shop/legal-page";
import { getLegalDocument } from "@/content/legal";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/termos">): Promise<Metadata> {
  const { locale } = await params;
  return { title: `${getLegalDocument("terms", locale).title} · Habinox` };
}

export default async function Page({ params }: PageProps<"/[locale]/termos">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Shop.legal");
  const document = getLegalDocument("terms", locale);
  return (
    <LegalPage
      document={document}
      updatedLabel={t("updated", { date: document.updated })}
      portugueseOnly={locale !== "pt" ? t("portugueseOnly") : undefined}
    />
  );
}
