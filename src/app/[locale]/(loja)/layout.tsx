import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { LegalLinks } from "@/components/shop/legal-links";
import { Link } from "@/i18n/navigation";
import { cartItemCount } from "@/server/store/cart";
import { getCurrentCart } from "@/server/store/current-cart";

// Loja: "arquitetura moderna, à noite" (DESIGN.md). Cabeçalho com fundo e linha;
// na página inicial passa a transparente por cima da fotografia (protótipo em docs/site-inicial).
export default async function ShopLayout({ children }: LayoutProps<"/[locale]">) {
  const t = await getTranslations("Shop");
  const cart = await getCurrentCart();
  const count = cart ? await cartItemCount(cart.id) : 0;
  return (
    <div className="bg-night text-night-text selection:bg-amber selection:text-on-amber flex flex-1 flex-col">
      <header className="border-night-line border-b">
        <nav
          aria-label={t("nav.main")}
          className="mx-auto flex h-[88px] w-full max-w-[1440px] items-center justify-between px-5 md:px-14"
        >
          <Link href="/" className="flex min-h-11 items-center">
            <Image
              src="/brand/habinox-logo-branco.svg"
              alt="Habinox"
              width={136}
              height={26}
              priority
            />
          </Link>
          <div className="text-night-soft flex items-center gap-6 text-sm">
            <Link href="/loja" className="hover:text-night-text flex min-h-11 items-center">
              {t("nav.shop")}
            </Link>
            <Link href="/conta" className="hover:text-night-text flex min-h-11 items-center">
              {t("nav.account")}
            </Link>
            <Link
              href="/carrinho"
              aria-label={t("nav.cartCount", { count })}
              className="hover:text-night-text flex min-h-11 items-center gap-2"
            >
              {t("nav.cart")}
              {count > 0 && (
                <span
                  aria-hidden
                  className="bg-amber text-on-amber min-w-5 rounded-full px-1.5 text-center font-mono text-xs leading-5"
                >
                  {count}
                </span>
              )}
            </Link>
          </div>
        </nav>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
      <footer className="border-night-line text-night-faint border-t">
        <div className="mx-auto grid w-full max-w-[1440px] gap-6 px-5 py-10 text-xs md:px-14">
          <LegalLinks className="text-night-soft" />
          <div className="flex flex-wrap justify-between gap-4">
            <p>{t("footer.vat")}</p>
            <p>{t("footer.rights", { year: new Date().getFullYear() })}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
