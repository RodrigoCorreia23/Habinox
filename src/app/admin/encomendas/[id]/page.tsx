import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import type { Address } from "@/lib/address";
import { formatEuros } from "@/lib/money";
import { isOrderStatus, nextStatuses } from "@/lib/orders/state";
import type { PricedLine } from "@/lib/pricing";
import { requireAdmin } from "@/server/auth/session";
import { getOrderAdmin } from "@/server/orders/admin";
import { STATUS_LABELS } from "../labels";
import { StatusForm } from "../status-form";

export const metadata: Metadata = { title: "Encomenda · Habinox" };

const dateTime = new Intl.DateTimeFormat("pt-PT", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Lisbon",
});

interface Snapshot {
  productName: string;
  summary: { key: string; name: string; value: string }[];
  facts: { label: string; value: number }[];
  pricing?: {
    lines: PricedLine[];
    consumables: { rate: string; costCents: number; priceCents: number } | null;
    netCents: number;
  };
}

const percent = (fraction: string) =>
  `${(Number(fraction) * 100).toLocaleString("pt-PT", { maximumFractionDigits: 2 })}%`;

function AddressBlock({ title, address }: { title: string; address: Address }) {
  return (
    <div>
      <h3 className="text-steel text-xs font-medium">{title}</h3>
      <address className="mt-1 text-sm leading-relaxed not-italic">
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
  );
}

export default async function OrderAdminPage({ params }: PageProps<"/admin/encomendas/[id]">) {
  await requireAdmin("/admin/encomendas");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const data = await getOrderAdmin(id);
  if (!data) notFound();
  const { order, items, events } = data;
  const status = isOrderStatus(order.status) ? order.status : null;
  const sameAddress =
    JSON.stringify(order.billingAddress) === JSON.stringify(order.shippingAddress);
  const totalCost = items.reduce((sum, item) => {
    const pricing = (item.snapshot as Snapshot).pricing;
    if (!pricing) return sum;
    const cost =
      pricing.lines.reduce((lineSum, line) => lineSum + line.costCents, 0) +
      (pricing.consumables?.costCents ?? 0);
    return sum + cost * item.quantity;
  }, 0);

  return (
    <main className="grid gap-8 px-4 py-6 md:px-6">
      <header className="grid gap-1">
        <p className="text-steel text-sm">
          <Link href="/admin/encomendas" className="underline-offset-4 hover:underline">
            Encomendas
          </Link>
        </p>
        <h1 className="font-mono text-xl font-semibold tracking-tight">{order.number}</h1>
        <p className="text-steel text-sm">
          {status ? STATUS_LABELS[status] : order.status} · feita a{" "}
          {dateTime.format(order.createdAt)}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid content-start gap-8">
          <section aria-labelledby="artigos" className="grid gap-3">
            <h2 id="artigos" className="font-semibold">
              Artigos
            </h2>
            <ol className="border-line bg-surface divide-line-soft divide-y border">
              {items.map((item) => {
                const snapshot = item.snapshot as Snapshot;
                return (
                  <li key={item.id} className="grid gap-3 px-4 py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium">
                        <span className="font-mono">{item.quantity} ×</span> {snapshot.productName}
                      </p>
                      <p className="font-mono text-sm tabular-nums">
                        {formatEuros(item.unitNetCents * item.quantity)} sem IVA
                        {item.quantity > 1 && (
                          <span className="text-steel">
                            {" "}
                            ({formatEuros(item.unitNetCents)} cada)
                          </span>
                        )}
                      </p>
                    </div>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-sm">
                      {snapshot.summary.map((choice) => (
                        <div key={choice.key} className="contents">
                          <dt className="text-steel">{choice.name}</dt>
                          <dd className="font-mono">{choice.value}</dd>
                        </div>
                      ))}
                      {snapshot.facts.map((fact) => (
                        <div key={fact.label} className="contents">
                          <dt className="text-steel">{fact.label}</dt>
                          <dd className="font-mono">{fact.value.toLocaleString("pt-PT")}</dd>
                        </div>
                      ))}
                    </dl>
                    {snapshot.pricing && (
                      <details>
                        <summary className="text-brand cursor-pointer text-xs">
                          Decomposição do preço (interna)
                        </summary>
                        <table className="mt-2 w-full text-xs">
                          <thead className="text-steel text-left">
                            <tr>
                              <th className="py-1 pr-3 font-medium">Linha</th>
                              <th className="py-1 pr-3 text-right font-medium">Qtd.</th>
                              <th className="py-1 pr-3 text-right font-medium">Custo</th>
                              <th className="py-1 pr-3 text-right font-medium">Margem</th>
                              <th className="py-1 text-right font-medium">Preço</th>
                            </tr>
                          </thead>
                          <tbody className="tabular-nums">
                            {snapshot.pricing.lines.map((line, index) => (
                              <tr key={index} className="border-line-soft border-t">
                                <td className="py-1 pr-3">
                                  {line.label} <span className="text-steel">({line.itemCode})</span>
                                </td>
                                <td className="py-1 pr-3 text-right">
                                  {Number(line.quantity).toLocaleString("pt-PT", {
                                    maximumFractionDigits: 3,
                                  })}{" "}
                                  {line.unit}
                                </td>
                                <td className="py-1 pr-3 text-right">
                                  {formatEuros(line.costCents)}
                                </td>
                                <td className="py-1 pr-3 text-right">{percent(line.margin)}</td>
                                <td className="py-1 text-right">{formatEuros(line.priceCents)}</td>
                              </tr>
                            ))}
                            {snapshot.pricing.consumables && (
                              <tr className="border-line-soft border-t">
                                <td className="py-1 pr-3">
                                  Consumíveis ({percent(snapshot.pricing.consumables.rate)})
                                </td>
                                <td />
                                <td className="py-1 pr-3 text-right">
                                  {formatEuros(snapshot.pricing.consumables.costCents)}
                                </td>
                                <td />
                                <td className="py-1 text-right">
                                  {formatEuros(snapshot.pricing.consumables.priceCents)}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </details>
                    )}
                  </li>
                );
              })}
            </ol>
            <dl className="ml-auto grid w-full max-w-sm grid-cols-[1fr_auto] gap-y-1 text-sm">
              <dt className="text-steel">Subtotal sem IVA</dt>
              <dd className="font-mono tabular-nums">{formatEuros(order.netCents)}</dd>
              <dt className="text-steel">IVA ({percent(order.vatRate)})</dt>
              <dd className="font-mono tabular-nums">{formatEuros(order.vatCents)}</dd>
              <dt className="font-semibold">Total</dt>
              <dd className="font-mono font-semibold tabular-nums">
                {formatEuros(order.totalCents)}
              </dd>
              {totalCost > 0 && (
                <>
                  <dt className="text-steel pt-2 text-xs">Custo estimado (interno)</dt>
                  <dd className="text-steel pt-2 font-mono text-xs tabular-nums">
                    {formatEuros(totalCost)}
                  </dd>
                </>
              )}
            </dl>
          </section>

          <section aria-labelledby="historico" className="grid gap-3">
            <h2 id="historico" className="font-semibold">
              Histórico
            </h2>
            <ol className="grid gap-2 text-sm">
              {events.map(({ event, actor }) => (
                <li key={event.id} className="grid gap-0.5">
                  <p>
                    <span className="text-steel tabular-nums">
                      {dateTime.format(event.createdAt)}
                    </span>{" "}
                    {isOrderStatus(event.toStatus) ? STATUS_LABELS[event.toStatus] : event.toStatus}
                    {actor && <span className="text-steel"> · {actor}</span>}
                  </p>
                  {event.note && <p className="text-steel">{event.note}</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="grid content-start gap-6">
          <section
            aria-labelledby="estado"
            className="border-line bg-surface grid gap-3 border px-4 py-4"
          >
            <h2 id="estado" className="font-semibold">
              Estado: {status ? STATUS_LABELS[status] : order.status}
            </h2>
            {/* A chave muda com o estado: o formulário recomeça com as opções novas. */}
            {status && <StatusForm key={status} orderId={order.id} next={nextStatuses(status)} />}
          </section>

          <section
            aria-labelledby="cliente"
            className="border-line bg-surface grid gap-4 border px-4 py-4"
          >
            <h2 id="cliente" className="font-semibold">
              Cliente
            </h2>
            <p className="text-sm">
              <a href={`mailto:${order.email}`} className="underline underline-offset-4">
                {order.email}
              </a>
              <br />
              <a href={`tel:${order.phone}`} className="font-mono underline underline-offset-4">
                {order.phone}
              </a>
              {order.nif && (
                <>
                  <br />
                  NIF <span className="font-mono">{order.nif}</span>
                </>
              )}
            </p>
            <AddressBlock title="Faturação" address={order.billingAddress} />
            {sameAddress ? (
              <p className="text-steel text-xs">Entrega na mesma morada.</p>
            ) : (
              <AddressBlock title="Entrega" address={order.shippingAddress} />
            )}
            {order.notes && (
              <div>
                <h3 className="text-steel text-xs font-medium">Notas do cliente</h3>
                <p className="mt-1 text-sm whitespace-pre-line">{order.notes}</p>
              </div>
            )}
            <p className="text-steel text-xs">
              Medidas e termos aceites a {dateTime.format(order.measuresAcceptedAt)}.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
