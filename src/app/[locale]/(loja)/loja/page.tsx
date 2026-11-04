import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listStoreCategories } from "@/server/store/catalog";

export async function generateMetadata({ params }: PageProps<"/[locale]/loja">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Shop.catalog" });
  return { title: `${t("title")} · Habinox`, description: t("intro") };
}

export default async function CatalogPage({ params }: PageProps<"/[locale]/loja">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Shop.catalog");
  const categories = await listStoreCategories(locale);
  const roots = categories.filter((category) => category.parentId === null);

  return (
    <main className="mx-auto w-full max-w-[1440px] px-5 pt-16 pb-24 md:px-14 md:pt-24 md:pb-36">
      <h1 className="font-display text-[clamp(64px,9vw,128px)] leading-none">{t("title")}</h1>
      <p className="text-night-muted mt-6 max-w-xl text-base leading-relaxed md:text-lg">
        {t("intro")}
      </p>

      {roots.length === 0 ? (
        <p className="text-night-muted mt-16">{t("empty")}</p>
      ) : (
        <ul className="border-night-line mt-16 border-t md:mt-24">
          {roots.map((category) => {
            const children = categories.filter((child) => child.parentId === category.id);
            return (
              <li key={category.id} className="border-night-line border-b">
                <Link
                  href={`/loja/${category.slug}`}
                  className="group flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 py-8 md:py-10"
                >
                  <span className="font-display group-hover:text-amber text-[clamp(36px,5vw,64px)] leading-none transition-colors">
                    {category.name}
                  </span>
                  <span className="text-night-faint font-mono text-sm">
                    {t("models", { count: category.productCount })}
                  </span>
                </Link>
                {children.length > 0 && (
                  <ul className="flex flex-wrap gap-x-6 gap-y-2 pb-8 text-sm">
                    {children.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={`/loja/${child.slug}`}
                          className="text-night-soft decoration-night-line-strong hover:text-amber hover:decoration-amber underline underline-offset-4"
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
