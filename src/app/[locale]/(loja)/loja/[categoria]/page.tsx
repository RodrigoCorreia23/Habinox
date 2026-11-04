import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getStoreCategory } from "@/server/store/catalog";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/loja/[categoria]">): Promise<Metadata> {
  const { locale, categoria } = await params;
  const data = await getStoreCategory(categoria, locale);
  return data
    ? {
        title: `${data.category.name} · Habinox`,
        description: data.category.description ?? undefined,
      }
    : {};
}

export default async function CategoryPage({ params }: PageProps<"/[locale]/loja/[categoria]">) {
  const { locale, categoria } = await params;
  setRequestLocale(locale);
  const data = await getStoreCategory(categoria, locale);
  if (!data) notFound();
  const t = await getTranslations("Shop");
  const { category, parent, children, products } = data;

  return (
    <main className="mx-auto w-full max-w-[1440px] px-5 pt-12 pb-24 md:px-14 md:pt-16 md:pb-36">
      <nav aria-label={t("category.breadcrumb")} className="text-night-faint font-mono text-xs">
        <Link href="/loja" className="hover:text-amber">
          {t("catalog.title")}
        </Link>
        {parent && (
          <>
            {" / "}
            <Link href={`/loja/${parent.slug}`} className="hover:text-amber">
              {parent.name}
            </Link>
          </>
        )}
      </nav>
      <h1 className="font-display mt-6 text-[clamp(56px,9vw,128px)] leading-none">
        {category.name}
      </h1>
      {category.description && (
        <p className="text-night-muted mt-6 max-w-xl text-base leading-relaxed md:text-lg">
          {category.description}
        </p>
      )}

      {children.length > 0 && (
        <ul className="mt-10 flex flex-wrap gap-2">
          {children.map((child) => (
            <li key={child.id}>
              <Link
                href={`/loja/${child.slug}`}
                className="border-night-line-strong hover:border-amber hover:text-amber flex min-h-11 items-center rounded-full border px-5 text-sm"
              >
                {child.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {products.length === 0 ? (
        <p className="text-night-muted mt-16">{t("category.empty")}</p>
      ) : (
        <ul className="mt-16 grid gap-x-6 gap-y-[72px] sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <li key={product.id}>
              <Link href={`/loja/${product.categorySlug}/${product.slug}`} className="group block">
                {/* Sem fotografia ainda: o fundo é o de uma imagem a carregar (DESIGN.md › surface). */}
                <div className="bg-night-surface flex aspect-[4/5] items-end p-6">
                  <span className="bg-amber text-on-amber group-hover:bg-amber-hover px-5 py-3 text-sm font-medium">
                    {t("category.configure")}
                  </span>
                </div>
                <h2 className="font-display group-hover:text-amber mt-5 text-2xl font-normal transition-colors">
                  {product.name}
                </h2>
                {product.description && (
                  <p className="text-night-muted mt-2 line-clamp-2 text-sm">
                    {product.description}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
