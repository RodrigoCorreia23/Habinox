import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/shop/legal-page";
import { getLegalDocument } from "@/content/legal";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/privacidade">): Promise<Metadata> {
  const { locale } = await params;
  return { title: `${getLegalDocument("privacy", locale).title} · Habinox` };
}

export default async function Page({ params }: PageProps<"/[locale]/privacidade">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Shop.legal");
  const document = getLegalDocument("privacy", locale);
  return <LegalPage document={document} updatedLabel={t("updated", { date: document.updated })} />;
}
