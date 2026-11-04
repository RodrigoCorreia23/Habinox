import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { objectPosition } from "@/lib/images";
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

  const crumbs = (
    <nav aria-label={t("category.breadcrumb")} className="text-night-faint font-mono text-xs">
      <Link href="/#familias" className="hover:text-amber">
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
  );

  return (
    <main className="pb-24 md:pb-36">
      {category.imageUrl ? (
        // Capa panorâmica (12:5 no backoffice): funde-se com o fundo em baixo e o título assenta nela.
        <div className="relative h-[clamp(440px,72vh,780px)] overflow-hidden">
          <Image
            src={category.imageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
            style={{ objectPosition: objectPosition(category.imageFocus) }}
          />
          <div
            aria-hidden
            className="from-night via-night/40 absolute inset-0 bg-gradient-to-t via-20% to-transparent to-45%"
          />
          <div
            aria-hidden
            className="from-night/55 absolute inset-0 bg-gradient-to-r to-transparent to-45%"
          />
          <div className="absolute inset-x-0 bottom-2">
            <div className="mx-auto w-full max-w-[1440px] px-5 md:px-14">
              {crumbs}
              <h1 className="font-display mt-4 text-[clamp(56px,9vw,128px)] leading-none">
                {category.name}
              </h1>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[1440px] px-5 pt-12 md:px-14 md:pt-16">
          {crumbs}
          <h1 className="font-display mt-6 text-[clamp(56px,9vw,128px)] leading-none">
            {category.name}
          </h1>
        </div>
      )}
      <div className="mx-auto w-full max-w-[1440px] px-5 md:px-14">
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
                <Link
                  href={`/loja/${product.categorySlug}/${product.slug}`}
                  className="group block"
                >
                  {/* Sem imagem, fica o fundo de uma imagem a carregar (DESIGN.md › surface). */}
                  <div className="bg-night-surface relative flex aspect-[4/5] items-end overflow-hidden p-6">
                    {product.imageUrl && (
                      <Image
                        src={product.imageUrl}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-[1.1s] ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04]"
                        style={{ objectPosition: objectPosition(product.imageFocus) }}
                      />
                    )}
                    <span className="bg-amber text-on-amber group-hover:bg-amber-hover relative px-5 py-3 text-sm font-medium">
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
      </div>
    </main>
  );
}
