import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { intlLocale } from "@/i18n/locales";
import { Link } from "@/i18n/navigation";
import { formatEuros } from "@/lib/money";
import { isOrderStatus } from "@/lib/orders/state";
import { COMPANY } from "@/content/legal/company";
import { requireUser } from "@/server/auth/session";
import { listOrdersForUser } from "@/server/orders/read";
import { getMarketingConsent } from "@/server/privacy";
import { MarketingToggle } from "./marketing-toggle";
import { SignOutButton } from "./sign-out-button";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/conta">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account" });
  return { title: `${t("title")} · Habinox`, robots: { index: false } };
}

const dateFormat = (locale: string) =>
  new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: "long",
    timeZone: "Europe/Lisbon",
  });

export default async function AccountPage({ params }: PageProps<"/[locale]/conta">) {
  const { locale } = await params;
  const money = (cents: number) => formatEuros(cents, intlLocale(locale));
  setRequestLocale(locale);
  const session = await requireUser(`/${locale}/conta`, locale);
  const t = await getTranslations("Account");
  const ts = await getTranslations("Shop.order");
  const [orders, marketing] = await Promise.all([
    listOrdersForUser(session.user.id),
    getMarketingConsent(session.user.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-[1440px] px-5 pt-12 pb-24 md:px-14 md:pt-16 md:pb-36">
      <h1 className="font-display text-[clamp(48px,7vw,96px)] leading-none">{t("title")}</h1>
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <p className="text-night-muted text-sm">{t("signedInAs", { email: session.user.email })}</p>
        <SignOutButton />
      </div>

      <section aria-labelledby="encomendas" className="mt-16 md:mt-24">
        <h2 id="encomendas" className="font-display text-[clamp(32px,4vw,48px)] leading-none">
          {t("orders")}
        </h2>
        {orders.length === 0 ? (
          <div className="mt-8">
            <p className="text-night-muted">{t("noOrders")}</p>
            <Link
              href="/#familias"
              className="text-night-soft hover:text-amber mt-4 inline-block text-sm underline underline-offset-4"
            >
              {t("browse")}
            </Link>
          </div>
        ) : (
          <ul className="border-night-line divide-night-line mt-8 divide-y border-y">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/encomenda/${order.number}`}
                  aria-label={t("open", { number: order.number })}
                  className="group grid gap-2 py-6 sm:grid-cols-[1fr_auto] sm:items-baseline"
                >
                  <div>
                    <p className="group-hover:text-amber font-mono text-lg transition-colors">
                      {order.number}
                    </p>
                    <p className="text-night-faint mt-1 text-sm">
                      {t("placedOn", { date: dateFormat(locale).format(order.createdAt) })} ·{" "}
                      {t("items", { count: order.items })}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="font-mono text-lg tabular-nums">{money(order.totalCents)}</p>
                    <p className="text-night-muted mt-1 text-sm">
                      {isOrderStatus(order.status) ? ts(`statuses.${order.status}`) : order.status}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="privacidade" className="mt-16 md:mt-24">
        <h2 id="privacidade" className="font-display text-[clamp(32px,4vw,48px)] leading-none">
          {t("privacy.title")}
        </h2>
        <div className="mt-8 grid gap-6">
          <MarketingToggle granted={marketing === true} />
          <p className="text-night-muted max-w-2xl text-sm leading-relaxed">
            {t.rich("privacy.erase", {
              email: COMPANY.email,
              mail: (chunks) => (
                <a
                  href={`mailto:${COMPANY.email}?subject=${encodeURIComponent(t("privacy.eraseSubject"))}`}
                  className="text-night-soft hover:text-amber underline underline-offset-4"
                >
                  {chunks}
                </a>
              ),
              policy: (chunks) => (
                <Link
                  href="/privacidade"
                  className="text-night-soft hover:text-amber underline underline-offset-4"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      </section>
    </main>
  );
}
