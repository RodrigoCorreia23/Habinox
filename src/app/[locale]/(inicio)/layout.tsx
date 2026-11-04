import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cartItemCount } from "@/server/store/cart";
import { getCurrentCart } from "@/server/store/current-cart";
import styles from "./home.module.css";

// Página inicial: cabeçalho transparente por cima da cena (sem o da loja).
export default async function HomeLayout({ children }: LayoutProps<"/[locale]">) {
  const t = await getTranslations("Home.nav");
  const cart = await getCurrentCart();
  const count = cart ? await cartItemCount(cart.id) : 0;

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Link href="/" className={styles.logo}>
          <Image
            src="/brand/habinox-logo-branco.svg"
            alt="Habinox"
            width={136}
            height={26}
            priority
          />
        </Link>
        <nav aria-label={t("main")} className={styles.nav}>
          <span className={styles.siteLinks}>
            <a href="#empresa">{t("company")}</a>
            <a href="#servicos">{t("services")}</a>
            <a href="#contactos">{t("contacts")}</a>
          </span>
          <Link href="/loja" className={styles.shopLink}>
            {t("shop")}
          </Link>
          <Link href="/conta">{t("account")}</Link>
          <Link href="/carrinho">
            {t("cart")}
            {count > 0 && <span className={styles.count}>{count}</span>}
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
