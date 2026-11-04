import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatEuros } from "@/lib/money";
import { CART_COOKIE, findCart, getCartView, MAX_QUANTITY } from "@/server/store/cart";
import { removeItemAction, setQuantityAction } from "./actions";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/carrinho">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Shop.cart" });
  return { title: `${t("title")} · Habinox`, robots: { index: false } };
}

const dateFormat = new Intl.DateTimeFormat("pt-PT", {
  dateStyle: "long",
  timeZone: "Europe/Lisbon",
});

export default async function CartPage({ params }: PageProps<"/[locale]/carrinho">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Shop.cart");
  const cart = await findCart((await cookies()).get(CART_COOKIE)?.value);
  const view = cart ? await getCartView(cart.id, locale) : null;
  const lines = view?.lines ?? [];
  const anyAvailable = lines.some((line) => !line.unavailable);

  return (
    <main className="mx-auto w-full max-w-[1440px] px-5 pt-12 pb-24 md:px-14 md:pt-16 md:pb-36">
      <h1 className="font-display text-[clamp(56px,9vw,128px)] leading-none">{t("title")}</h1>

      {lines.length === 0 ? (
        <div className="mt-12">
          <p className="text-night-muted">{t("empty")}</p>
          <Link
            href="/loja"
            className="bg-amber text-on-amber hover:bg-amber-hover mt-8 inline-flex min-h-14 items-center px-8 font-medium"
          >
            {t("browse")}
          </Link>
        </div>
      ) : (
        <div className="mt-12 grid gap-14 lg:grid-cols-12">
          <ul className="border-night-line divide-night-line divide-y border-y lg:col-span-8">
            {lines.map((line) => (
              <li key={line.id} className="grid gap-4 py-8 sm:grid-cols-[1fr_auto]">
                <div>
                  <h2 className="font-display text-2xl font-normal">
                    {line.productUrl ? (
                      <Link href={line.productUrl} className="hover:text-amber">
                        {line.productName}
                      </Link>
                    ) : (
                      line.productName
                    )}
                  </h2>
                  <dl className="text-night-muted mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    {line.summary.map((choice) => (
                      <div key={choice.key} className="contents">
                        <dt className="text-night-faint">{choice.name}</dt>
                        <dd className="font-mono">{choice.value}</dd>
                      </div>
                    ))}
                  </dl>
                  {line.unavailable ? (
                    <p className="text-night-error mt-3 text-sm">{t("unavailable")}</p>
                  ) : line.repriced ? (
                    <p className="text-amber mt-3 text-sm">
                      {t("repriced", { amount: formatEuros(line.repriced.previousTotalCents) })}
                    </p>
                  ) : (
                    <p className="text-night-faint mt-3 text-xs">
                      {t("validUntil", { date: dateFormat.format(line.validUntil) })}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-start gap-4 sm:flex-col sm:items-end">
                  {line.unitTotalCents !== null && (
                    <p className="font-mono text-2xl tabular-nums">
                      {formatEuros(line.unitTotalCents * line.quantity)}
                    </p>
                  )}
                  {line.unitTotalCents !== null && line.quantity > 1 && (
                    <p className="text-night-faint font-mono text-xs">
                      {t("unitPrice", { amount: formatEuros(line.unitTotalCents) })}
                    </p>
                  )}
                  <form
                    // A chave muda com a quantidade: o React volta a montar o seletor com o valor gravado.
                    key={`${line.id}-${line.quantity}`}
                    action={setQuantityAction.bind(null, line.id)}
                    className="flex items-center gap-2"
                  >
                    <label htmlFor={`qty-${line.id}`} className="text-night-faint text-xs">
                      {t("quantity")}
                    </label>
                    <select
                      id={`qty-${line.id}`}
                      name="quantity"
                      defaultValue={line.quantity}
                      className="bg-night-surface border-night-line-strong h-11 rounded-[2px] border px-2 font-mono text-sm"
                    >
                      {Array.from(
                        { length: Math.min(MAX_QUANTITY, 20) },
                        (_, index) => index + 1,
                      ).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="text-night-soft hover:text-amber min-h-11 text-sm underline underline-offset-4"
                    >
                      {t("update")}
                    </button>
                  </form>
                  <form action={removeItemAction.bind(null, line.id)}>
                    <button
                      type="submit"
                      className="text-night-faint hover:text-night-error min-h-11 text-sm underline underline-offset-4"
                    >
                      {t("remove")}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>

          <aside className="lg:col-span-4">
            <dl className="grid grid-cols-[1fr_auto] gap-y-3 text-sm">
              <dt className="text-night-muted">{t("subtotal")}</dt>
              <dd className="font-mono tabular-nums">{formatEuros(view!.netCents)}</dd>
              <dt className="text-night-muted">
                {t("vat", { rate: (Number(view!.vatRate) * 100).toLocaleString("pt-PT") })}
              </dt>
              <dd className="font-mono tabular-nums">{formatEuros(view!.vatCents)}</dd>
              <dt className="border-night-line border-t pt-4 text-base">{t("total")}</dt>
              <dd className="border-night-line border-t pt-4 font-mono text-2xl tabular-nums">
                {formatEuros(view!.totalCents)}
              </dd>
            </dl>
            {anyAvailable ? (
              <Link
                href="/checkout"
                className="bg-amber text-on-amber hover:bg-amber-hover focus-visible:outline-night-text mt-8 flex min-h-[60px] w-full items-center justify-center px-6 font-medium outline-offset-3 focus-visible:outline-2"
              >
                {t("checkout")}
              </Link>
            ) : (
              <p className="text-night-error mt-8 text-sm">{t("unavailable")}</p>
            )}
            <p className="text-night-muted mt-6 text-sm">{t("measuresNote")}</p>
          </aside>
        </div>
      )}
    </main>
  );
}
