import type { Metadata } from "next";
import Image from "next/image";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { LegalLinks } from "@/components/shop/legal-links";
import { Link } from "@/i18n/navigation";
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
  const messages = (await getMessages()) as unknown as {
    Home: { how: { items: string[] }; services: { items: string[] }; near: { items: string[] } };
  };
  const list = messages.Home;
  const quoteHref = `mailto:geral@habinox.pt?subject=${encodeURIComponent(t("shop.quoteSubject"))}`;

  return (
    <>
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
            <Link href="/loja" className={styles.btnShop}>
              {t("shop.enter")} <span aria-hidden="true">→</span>
            </Link>
            <a href={quoteHref} className={styles.btnQuote}>
              {t("shop.quote")}
            </a>
          </div>
          <LegalLinks className={styles.legal} />
        </section>
      </main>
    </>
  );
}
