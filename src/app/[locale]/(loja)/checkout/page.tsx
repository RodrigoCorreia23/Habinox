import { intlLocale } from "@/i18n/locales";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckoutForm } from "@/components/shop/checkout-form";
import { formatEuros } from "@/lib/money";
import { requireUser } from "@/server/auth/session";
import { getCartView } from "@/server/store/cart";
import { getCurrentCart } from "@/server/store/current-cart";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/checkout">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Shop.checkout" });
  return { title: `${t("title")} · Habinox`, robots: { index: false } };
}

export default async function CheckoutPage({ params }: PageProps<"/[locale]/checkout">) {
  const { locale } = await params;
  const money = (cents: number) => formatEuros(cents, intlLocale(locale));
  setRequestLocale(locale);
  const session = await requireUser(`/${locale}/checkout`, locale);
  const cart = await getCurrentCart();
  const view = cart ? await getCartView(cart.id, locale) : null;
  if (!view || view.lines.length === 0) redirect(`/${locale}/carrinho`);
  const t = await getTranslations("Shop.checkout");
  const tc = await getTranslations("Shop.cart");

  return (
    <main className="mx-auto w-full max-w-[1440px] px-5 pt-12 pb-24 md:px-14 md:pt-16 md:pb-36">
      <h1 className="font-display text-[clamp(48px,7vw,96px)] leading-none">{t("title")}</h1>
      <p className="text-night-muted mt-4 text-sm">
        {t("signedInAs", { email: session.user.email })}
      </p>

      <div className="mt-12 grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <CheckoutForm locale={locale} totalCents={view.totalCents} />
        </div>
        <aside aria-labelledby="resumo" className="lg:col-span-5">
          <div className="lg:sticky lg:top-8">
            <h2 id="resumo" className="font-display text-3xl">
              {t("summary")}
            </h2>
            <ul className="border-night-line divide-night-line mt-6 divide-y border-y">
              {view.lines.map((line) => (
                <li key={line.id} className="flex justify-between gap-4 py-4 text-sm">
                  <div>
                    <p>
                      <span className="font-mono">{line.quantity} ×</span> {line.productName}
                    </p>
                    <p className="text-night-faint mt-1 font-mono text-xs">
                      {line.summary.map((choice) => choice.value).join(" · ")}
                    </p>
                    {line.unavailable && (
                      <p className="text-night-error mt-1 text-xs">{tc("unavailable")}</p>
                    )}
                  </div>
                  {line.unitTotalCents !== null && (
                    <p className="font-mono tabular-nums">
                      {money(line.unitTotalCents * line.quantity)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <dl className="mt-6 grid grid-cols-[1fr_auto] gap-y-3 text-sm">
              <dt className="text-night-muted">{tc("subtotal")}</dt>
              <dd className="font-mono tabular-nums">{money(view.netCents)}</dd>
              <dt className="text-night-muted">
                {tc("vat", {
                  rate: (Number(view.vatRate) * 100).toLocaleString(intlLocale(locale)),
                })}
              </dt>
              <dd className="font-mono tabular-nums">{money(view.vatCents)}</dd>
              <dt className="text-night-muted">{t("transport")}</dt>
              <dd className="text-night-muted text-right">{t("transportValue")}</dd>
              <dt className="border-night-line border-t pt-4 text-base">{tc("total")}</dt>
              <dd className="border-night-line border-t pt-4 font-mono text-2xl tabular-nums">
                {money(view.totalCents)}
              </dd>
            </dl>
          </div>
        </aside>
      </div>
    </main>
  );
}
