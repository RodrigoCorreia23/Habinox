import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatEuros } from "@/lib/money";
import { requireUser } from "@/server/auth/session";
import { getOrderForUser } from "@/server/orders/read";

export const metadata: Metadata = { robots: { index: false } };

interface ItemSnapshot {
  productName: string;
  summary: { key: string; name: string; value: string }[];
}

export default async function OrderPage({ params }: PageProps<"/[locale]/encomenda/[numero]">) {
  const { locale, numero } = await params;
  setRequestLocale(locale);
  const session = await requireUser(`/${locale}/encomenda/${numero}`, locale);
  const data = await getOrderForUser(numero, session.user.id);
  if (!data) notFound();
  const { order, items } = data;
  const t = await getTranslations("Shop.order");
  const tc = await getTranslations("Shop.cart");
  const address = order.shippingAddress;

  return (
    <main className="mx-auto w-full max-w-[1440px] px-5 pt-12 pb-24 md:px-14 md:pt-16 md:pb-36">
      <p className="text-amber font-mono text-sm">{t("thanks")}</p>
      <h1 className="font-display mt-4 text-[clamp(40px,6vw,80px)] leading-none">
        {t("title", { number: order.number })}
      </h1>
      <p className="text-night-muted mt-6 max-w-2xl text-base leading-relaxed">
        {t("emailSent", { email: order.email })} {t("next")}
      </p>

      <div className="mt-14 grid gap-14 lg:grid-cols-12">
        <section aria-labelledby="artigos" className="lg:col-span-7">
          <h2 id="artigos" className="font-display text-3xl">
            {t("items")}
          </h2>
          <ul className="border-night-line divide-night-line mt-6 divide-y border-y">
            {items.map((item) => {
              const snapshot = item.snapshot as ItemSnapshot;
              return (
                <li key={item.id} className="py-6">
                  <p className="font-display text-xl font-normal">
                    <span className="font-mono text-base">{item.quantity} ×</span>{" "}
                    {snapshot.productName}
                  </p>
                  <dl className="text-night-muted mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    {snapshot.summary.map((choice) => (
                      <div key={choice.key} className="contents">
                        <dt className="text-night-faint">{choice.name}</dt>
                        <dd className="font-mono">{choice.value}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="grid content-start gap-10 lg:col-span-5">
          <dl className="grid grid-cols-[1fr_auto] gap-y-3 text-sm">
            <dt className="text-night-muted">{t("status")}</dt>
            <dd>{t(`statuses.${order.status as "pending_payment"}`)}</dd>
            <dt className="text-night-muted">{tc("subtotal")}</dt>
            <dd className="font-mono tabular-nums">{formatEuros(order.netCents)}</dd>
            <dt className="text-night-muted">
              {tc("vat", { rate: (Number(order.vatRate) * 100).toLocaleString("pt-PT") })}
            </dt>
            <dd className="font-mono tabular-nums">{formatEuros(order.vatCents)}</dd>
            <dt className="border-night-line border-t pt-4 text-base">{tc("total")}</dt>
            <dd className="border-night-line border-t pt-4 font-mono text-2xl tabular-nums">
              {formatEuros(order.totalCents)}
            </dd>
          </dl>
          <div>
            <h2 className="text-night-faint font-mono text-xs tracking-[0.08em] uppercase">
              {t("deliverTo")}
            </h2>
            <address className="mt-3 text-sm leading-relaxed not-italic">
              {address.name}
              <br />
              {address.line1}
              {address.line2 && (
                <>
                  <br />
                  {address.line2}
                </>
              )}
              <br />
              <span className="font-mono">{address.postalCode}</span> {address.city}
            </address>
          </div>
          <Link
            href="/loja"
            className="text-night-soft hover:text-amber text-sm underline underline-offset-4"
          >
            {t("backToShop")}
          </Link>
        </aside>
      </div>
    </main>
  );
}
