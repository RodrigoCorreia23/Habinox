import type { Metadata } from "next";
import Image from "next/image";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { LegalLinks } from "@/components/shop/legal-links";
import { Link } from "@/i18n/navigation";
import { getSession } from "@/server/auth/session";
import { cartItemCount } from "@/server/store/cart";
import { firstPublishedProductPath, listStoreCategories } from "@/server/store/catalog";
import { getCurrentCart } from "@/server/store/current-cart";
import { CategoryRails, type RailTile } from "./category-rails";
import { HomeScene } from "./home-scene";
import styles from "./home.module.css";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Home" });
  return { title: t("title"), description: t("description") };
}

/** As palavras dos títulos chegam uma a uma, presas ao scroll. */
function Words({ text }: { text: string }) {
  return text
    .trim()
    .split(/\s+/)
    .map((word, i) => (
      <span key={i}>
        {i > 0 && " "}
        <span data-word className={styles.word}>
          {word}
        </span>
      </span>
    ));
}

/**
 * Fotografias PROVISÓRIAS das categorias (Unsplash, ilustrativas, do protótipo):
 * usadas enquanto a categoria não tem imagem própria. Trocar pelas fotografias das
 * obras da Habinox antes de abrir a loja.
 */
const PROVISIONAL_PHOTOS = [
  "portao-geometrico",
  "escada-corrimao-luz",
  "guarda-varanda",
  "chamine-chapeus",
  "caixa-correio",
  "portao-correr-cinza",
  "portao-pedonal",
  "escada-caracol",
  "guarda-preta",
  "portao-ripas",
  "escada-madeira-luz",
  "portao-perfurado",
].map((name) => `/home/provisorio/${name}.webp`);

/** Momentos do percurso (fração do scroll) em que cada bloco aparece e sai. */
const BLOCKS = {
  inicio: [0, 0.055],
  empresa: [0.085, 0.14],
  como: [0.15, 0.245],
  servicos: [0.32, 0.46],
  inox: [0.5, 0.6],
  perto: [0.63, 0.73],
  numeros: [0.76, 0.85],
  contactos: [0.87, 0.94],
  loja: [0.955, 1],
} as const;

function blockProps(id: keyof typeof BLOCKS, side: "left" | "right") {
  const [a, b] = BLOCKS[id];
  return { id, "data-block": true, "data-in": a, "data-out": b, "data-side": side };
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");
  const tShop = await getTranslations("Shop");
  const messages = (await getMessages()) as unknown as {
    Home: { how: { items: string[] }; services: { items: string[] }; near: { items: string[] } };
  };
  const list = messages.Home;
  const quoteHref = `mailto:geral@habinox.pt?subject=${encodeURIComponent(t("shop.quoteSubject"))}`;
  const [session, cart, categories, configurePath] = await Promise.all([
    getSession(),
    getCurrentCart(),
    listStoreCategories(locale),
    firstPublishedProductPath(),
  ]);
  const count = cart ? await cartItemCount(cart.id) : 0;
  const tiles: RailTile[] = categories.map((category, i) => ({
    key: category.id,
    href: `/loja/${category.slug}`,
    name: category.name,
    sub:
      category.description?.split(/(?<=\.)\s/)[0] ??
      t("catalog.models", { count: category.productCount }),
    image: category.imageUrl ?? PROVISIONAL_PHOTOS[i % PROVISIONAL_PHOTOS.length]!,
  }));
  // Duas filas, alternando as categorias (como no protótipo).
  const rows =
    tiles.length > 1
      ? [tiles.filter((_, i) => i % 2 === 0), tiles.filter((_, i) => i % 2 === 1)]
      : [tiles];

  return (
    <>
      <header className={styles.top}>
        <a href="#loja" className={styles.logo} aria-label={t("nav.home")} data-logo>
          HABINOX<sup>®</sup>
        </a>
        <nav aria-label={t("nav.main")} className={styles.nav}>
          <div className={styles.navSite}>
            <a href="#empresa">{t("nav.company")}</a>
            <a href="#servicos">{t("nav.services")}</a>
            <a href="#contactos">{t("nav.contacts")}</a>
            <a href="#loja" className={styles.shopLink}>
              {t("nav.shop")}
            </a>
          </div>
          <div className={styles.tools}>
            {session ? (
              <Link href="/conta">{t("nav.account")}</Link>
            ) : (
              <Link href="/entrar">{t("nav.signIn")}</Link>
            )}
            <Link
              href="/carrinho"
              className={styles.bag}
              aria-label={t("nav.cartCount", { count })}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 8h14l1 13H4L5 8Z" />
                <path d="M9 11V6a3 3 0 0 1 6 0v5" />
              </svg>
              {count > 0 && <span className={styles.count}>{count}</span>}
            </Link>
          </div>
        </nav>
      </header>

      <HomeScene
        labels={[
          { text: t("progress.company"), at: 0 },
          { text: t("progress.services"), at: BLOCKS.servicos[0] },
          { text: t("progress.contacts"), at: BLOCKS.contactos[0] },
          { text: t("progress.shop"), at: BLOCKS.loja[0] },
        ]}
      />

      <main className={styles.track}>
        <section
          {...blockProps("inicio", "left")}
          className={`${styles.block} ${styles.hero} ${styles.left} ${styles.narrow}`}
        >
          <p className={styles.num}>{t("hero.kicker")}</p>
          <h1>{t("hero.title")}</h1>
          <p className={styles.hint}>{t("hero.hint")}</p>
        </section>

        <section
          {...blockProps("empresa", "left")}
          className={`${styles.block} ${styles.left} ${styles.narrow}`}
        >
          <p className={styles.num}>{t("company.kicker")}</p>
          <h2>
            <Words text={t("company.title")} />
          </h2>
          <p className={styles.lead}>{t("company.lead")}</p>
        </section>

        <section {...blockProps("como", "left")} className={`${styles.block} ${styles.left}`}>
          <p className={styles.num}>{t("how.kicker")}</p>
          <h2>
            <Words text={t("how.title")} />
          </h2>
          <p className={styles.lead}>{t("how.lead")}</p>
          <div className={styles.withPhoto}>
            <ul className={styles.lines}>
              {list.how.items.map((item) => (
                <li key={item} data-item>
                  {item}
                </li>
              ))}
            </ul>
            <figure className={styles.work}>
              <Image
                src="/home/900/f090.webp"
                alt={t("how.photoAlt")}
                width={900}
                height={506}
                sizes="132px"
              />
              <figcaption>{t("how.photoCaption")}</figcaption>
            </figure>
          </div>
        </section>

        <section
          {...blockProps("servicos", "right")}
          className={`${styles.block} ${styles.right} ${styles.services}`}
        >
          <p className={styles.num}>{t("services.kicker")}</p>
          <h2>
            <Words text={t("services.title")} />
          </h2>
          <ul className={`${styles.lines} ${styles.cols}`}>
            {list.services.items.map((item) => (
              <li key={item} data-item>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section {...blockProps("inox", "right")} className={`${styles.block} ${styles.right}`}>
          <p className={styles.num}>{t("steel.kicker")}</p>
          <h2>
            <Words text={t("steel.title")} />
          </h2>
          <p className={styles.lead}>{t("steel.lead")}</p>
        </section>

        <section {...blockProps("perto", "left")} className={`${styles.block} ${styles.left}`}>
          <p className={styles.num}>{t("near.kicker")}</p>
          <h2>
            <Words text={t("near.title")} />
          </h2>
          <ul className={styles.lines}>
            {list.near.items.map((item) => (
              <li key={item} data-item>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section {...blockProps("numeros", "left")} className={`${styles.block} ${styles.left}`}>
          <p className={styles.num}>{t("numbers.kicker")}</p>
          <h2>
            <Words text={t("numbers.title")} />
          </h2>
          {/* Só números confirmados: clientes e toneladas esperam pelos valores do Bruno. */}
          <div className={styles.stats}>
            <div className={styles.stat}>
              <b data-to="20" data-suffix="+">
                20+
              </b>
              <span>
                {t("numbers.years")} ({t("numbers.since")})
              </span>
            </div>
          </div>
        </section>

        <section
          {...blockProps("contactos", "right")}
          className={`${styles.block} ${styles.right} ${styles.contacts}`}
        >
          <p className={styles.num}>{t("contacts.kicker")}</p>
          <h2>
            <Words text={t("contacts.title")} />
          </h2>
          <ul className={styles.lines}>
            <li data-item>
              <address style={{ fontStyle: "normal" }}>{t("contacts.address")}</address>
            </li>
            <li data-item>
              <span className={styles.noWrap}>
                {t("contacts.phone")} <a href="tel:+351253873429">253 873 429</a>
              </span>{" "}
              ·{" "}
              <span className={styles.noWrap}>
                {t("contacts.mobile")} <a href="tel:+351969413616">969 413 616</a>
              </span>
            </li>
            <li data-item>
              <a href="mailto:geral@habinox.pt">geral@habinox.pt</a> ·{" "}
              <a
                href="https://www.google.com/maps?q=41.61266,-8.77526"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("contacts.map")} ↗
              </a>
            </li>
          </ul>
          <p className={styles.note}>{t("contacts.hours")}</p>
        </section>

        <section {...blockProps("loja", "left")} className={`${styles.block} ${styles.left}`}>
          <p className={styles.num}>{t("shop.kicker")}</p>
          <h2>
            <Words text={t("shop.title")} />
          </h2>
          <div className={styles.actions}>
            <a href="#loja" className={styles.btnShop}>
              {t("shop.enter")} <span aria-hidden="true">→</span>
            </a>
            <a href={quoteHref} className={styles.btnQuote}>
              {t("shop.quote")}
            </a>
          </div>
          <LegalLinks className={styles.legal} />
        </section>
      </main>

      {/* Estado "loja": a câmara pára na escada; por baixo, as categorias. */}
      <div className={styles.shop}>
        <section className={styles.sHero} data-shop-hero>
          <div className={styles.wrap}>
            <h1 className={styles.stag}>
              {t("shopHero.title")} <em>{t("shopHero.accent")}</em>
            </h1>
            <p className={styles.stag}>{t("shopHero.lead")}</p>
            <div className={`${styles.row} ${styles.stag}`}>
              {configurePath && (
                <Link href={configurePath} className={styles.primary}>
                  {t("shopHero.configure")}
                </Link>
              )}
              <a href="#familias" className={styles.tlink}>
                {t("shopHero.browse")}
              </a>
            </div>
          </div>
        </section>
        <div className={styles.sBody}>
          {tiles.length === 0 ? (
            <div id="familias" className={`${styles.wrap} ${styles.catHead}`}>
              <h2 className={styles.sTitle}>{t("catalog.title")}</h2>
              <p className={styles.sSub}>{t("catalog.empty")}</p>
            </div>
          ) : (
            <CategoryRails
              id="familias"
              rows={rows}
              labels={{
                pause: t("catalog.pause"),
                resume: t("catalog.resume"),
                heading: t("catalog.title"),
              }}
              head={
                <div>
                  <h2 className={styles.sTitle}>{t("catalog.title")}</h2>
                  <p className={styles.sSub}>{t("catalog.sub")}</p>
                </div>
              }
            />
          )}
          <div className={styles.wrap}>
            <footer className={styles.foot}>
              <LegalLinks />
              <div className={styles.footRow}>
                <span>
                  {tShop("footer.rights", { year: new Date().getFullYear() })} ·{" "}
                  {tShop("footer.vat")}
                </span>
                <a href="#inicio">{t("nav.about")}</a>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </>
  );
}
