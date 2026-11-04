import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Configurator } from "@/components/shop/configurator";
import { Link } from "@/i18n/navigation";
import { getStoreProduct } from "@/server/store/catalog";
import { getSetting } from "@/server/settings";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/loja/[categoria]/[produto]">): Promise<Metadata> {
  const { locale, categoria, produto } = await params;
  const data = await getStoreProduct(categoria, produto, locale);
  return data
    ? {
        title: `${data.product.name} · Habinox`,
        description: data.product.description ?? undefined,
      }
    : {};
}

export default async function ProductPage({
  params,
}: PageProps<"/[locale]/loja/[categoria]/[produto]">) {
  const { locale, categoria, produto } = await params;
  setRequestLocale(locale);
  const data = await getStoreProduct(categoria, produto, locale);
  if (!data) notFound();
  const t = await getTranslations("Shop");
  const { days } = await getSetting("quote_validity_days");

  return (
    <main className="mx-auto w-full max-w-[1440px] px-5 pt-10 pb-24 md:px-14 md:pt-14 md:pb-36">
      <nav aria-label={t("category.breadcrumb")} className="text-night-faint font-mono text-xs">
        <Link href="/loja" className="hover:text-amber">
          {t("catalog.title")}
        </Link>
        {" / "}
        <Link href={`/loja/${data.category.slug}`} className="hover:text-amber">
          {data.category.name}
        </Link>
      </nav>
      <h1 className="font-display mt-6 text-[clamp(56px,7vw,80px)] leading-none">
        {data.product.name}
      </h1>
      {data.product.description && (
        <p className="text-night-muted mt-6 max-w-2xl text-base leading-relaxed md:text-lg">
          {data.product.description}
        </p>
      )}
      <div className="mt-12 md:mt-16">
        <Configurator
          productId={data.product.id}
          locale={locale}
          data={data.configurator}
          validityDays={days}
        />
      </div>
    </main>
  );
}
