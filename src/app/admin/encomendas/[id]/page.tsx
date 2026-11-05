import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";
import { ArrowRight, ChevronRight, Mail } from "lucide-react";
import { z } from "zod";
import { Notice } from "@/components/admin/notice";
import { PageBody } from "@/components/admin/page-body";
import { PageHeader } from "@/components/admin/page-header";
import { PriceTicket } from "@/components/admin/price-ticket";
import { Panel, Section } from "@/components/admin/section";
import { OrderStatusBadge, StatusBadge } from "@/components/admin/status-badge";
import { type Step, StepList } from "@/components/admin/step-list";
import type { Address } from "@/lib/address";
import { formatDateTime, formatTime } from "@/lib/format-date";
import { formatEuros, parseDecimal, vatCents } from "@/lib/money";
import { isOrderStatus, nextStatuses, type OrderStatus } from "@/lib/orders/state";
import type { PricedLine } from "@/lib/pricing";
import { isAnonymized } from "@/lib/privacy";
import { requireAdmin } from "@/server/auth/session";
import { getOrderAdmin } from "@/server/orders/admin";
import { ORDER_STEPS, STATUS_LABELS } from "../labels";
import { StatusForm } from "../status-form";

export const metadata: Metadata = { title: "Encomenda · Habinox" };

/** Durante quanto tempo a última mudança de estado aparece como aviso na secção Estado. */
const RECENT_CHANGE_MS = 30 * 60_000;

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

const numbers = new Intl.NumberFormat("pt-PT", { useGrouping: "always", maximumFractionDigits: 3 });
const percent = (fraction: string) =>
  `${(Number(fraction) * 100).toLocaleString("pt-PT", { maximumFractionDigits: 2 })} %`;

function AddressBlock({ title, address }: { title: string; address: Address }) {
  return (
    <div>
      <h3 className="text-steel text-[13px] font-medium">{title}</h3>
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
        {address.postalCode} {address.city}
      </address>
    </div>
  );
}

/**
 * A régua dos passos: os anteriores com visto, o estado atual marcado e o resto por fazer.
 * Em «Entregue» já não há passo atual: está tudo feito.
 */
function orderSteps(status: OrderStatus): Step[] {
  const reached = ORDER_STEPS.findIndex((step) => step.status === status);
  const finished = reached === ORDER_STEPS.length - 1;
  return ORDER_STEPS.map((step, index) => ({
    title: step.label,
    status: index < reached || finished ? "done" : index === reached ? "current" : "todo",
  }));
}

/** Uma linha da decomposição: «3 m · Tubo ferro 40×40», com o código do ERP no title. */
function pricedLineRow(line: PricedLine, quantity = 1) {
  return {
    label: line.itemCode ? (
      <span title={`Código no ERP: ${line.itemCode}`}>{line.label}</span>
    ) : (
      line.label
    ),
    detail: `${quantity > 1 ? `${quantity} × ` : ""}${numbers.format(Number(line.quantity))} ${line.unit}${
      line.itemName && line.itemName !== line.label ? ` · ${line.itemName}` : ""
    }`,
    amountCents: line.priceCents * quantity,
  };
}

/** As linhas da decomposição de um artigo (por unidade, ou multiplicadas pela quantidade). */
function pricingRows(pricing: NonNullable<Snapshot["pricing"]>, quantity = 1) {
  return [
    ...pricing.lines.map((line) => pricedLineRow(line, quantity)),
    ...(pricing.consumables
      ? [
          {
            label: "Consumíveis",
            detail: `${quantity > 1 ? `${quantity} × ` : ""}${percent(pricing.consumables.rate)} dos materiais`,
            amountCents: pricing.consumables.priceCents * quantity,
          },
        ]
      : []),
  ];
}

/**
 * Decomposição de um artigo quando a encomenda tem vários: fechada, por unidade,
 * no mesmo desenho do talão (pontilhado até ao valor).
 */
function ItemBreakdown({ pricing }: { pricing: NonNullable<Snapshot["pricing"]> }) {
  return (
    <details className="group/item">
      <summary className="text-amber-ink focus-visible:ring-amber-ink inline-flex cursor-pointer list-none items-center gap-1 rounded-[2px] text-sm outline-none select-none hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden
          className="size-4 transition-transform duration-150 group-open/item:rotate-90"
          strokeWidth={1.75}
        />
        Como se chega a este preço
      </summary>
      <div className="mt-3 grid max-w-xl gap-2">
        <p className="text-steel text-[13px]/[18px]">Por unidade, sem IVA:</p>
        {pricingRows(pricing).map((row, index) => (
          <div key={index} className="flex items-end gap-2 text-sm">
            <span className="min-w-0">
              {row.label}
              <span className="text-steel block text-[13px]/[18px]">{row.detail}</span>
            </span>
            <span
              aria-hidden
              className="border-line-strong mb-1 min-w-4 flex-1 border-b border-dotted"
            />
            <span className="shrink-0 tabular-nums">{formatEuros(row.amountCents)}</span>
          </div>
        ))}
      </div>
    </details>
  );
}

export default async function OrderAdminPage({ params }: PageProps<"/admin/encomendas/[id]">) {
  await requireAdmin("/admin/encomendas");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const data = await getOrderAdmin(id);
  if (!data) notFound();
  const { order, items, events, customer, previousOrders, readAt } = data;
  const status = isOrderStatus(order.status) ? order.status : null;
  const sameAddress =
    JSON.stringify(order.billingAddress) === JSON.stringify(order.shippingAddress);
  const vatRate = parseDecimal(order.vatRate);
  const totalCost = items.reduce((sum, item) => {
    const pricing = (item.snapshot as Snapshot).pricing;
    if (!pricing) return sum;
    const cost =
      pricing.lines.reduce((lineSum, line) => lineSum + line.costCents, 0) +
      (pricing.consumables?.costCents ?? 0);
    return sum + cost * item.quantity;
  }, 0);

  const stepIndex = status ? ORDER_STEPS.findIndex((step) => step.status === status) : -1;
  const currentStep = ORDER_STEPS[stepIndex];
  const followingStep = ORDER_STEPS[stepIndex + 1];
  // Com um só artigo, o talão do total traz a decomposição (o preço não aparece duas vezes).
  const onlyItem = items.length === 1 ? items[0] : undefined;
  const singleItem = onlyItem !== undefined;
  const singlePricing = onlyItem ? (onlyItem.snapshot as Snapshot).pricing : undefined;

  // A última mudança feita há pouco fica à vista como confirmação (sobrevive a recarregar).
  const lastChange = [...events].reverse().find(({ event }) => event.fromStatus !== null)?.event;
  const recentChange =
    lastChange &&
    isOrderStatus(lastChange.toStatus) &&
    readAt.getTime() - lastChange.createdAt.getTime() < RECENT_CHANGE_MS
      ? lastChange
      : null;

  const actorText = (actorUserId: string | null, name: string | null, email: string | null) => {
    if (actorUserId === null) return "automático";
    if (actorUserId === order.userId) return "pelo cliente";
    return `por ${name ?? email ?? "alguém da oficina"}`;
  };

  return (
    <PageBody>
      <PageHeader
        crumbs={[{ href: "/admin/encomendas", label: "Encomendas" }]}
        title={<span className="font-mono">{order.number}</span>}
        status={status ? <OrderStatusBadge status={status} /> : undefined}
        description={`${order.billingAddress.name} · ${order.billingAddress.city}`}
        meta={`Feita a ${formatDateTime(order.createdAt)}`}
      />

      {status && currentStep && (
        <>
          {/* No telemóvel a régua não cabe: mostra só em que passo está e o que vem a seguir. */}
          <p className="border-line -mt-4 mb-8 border-b pb-3 text-sm md:hidden">
            <span className="text-steel tabular-nums">
              Passo {stepIndex + 1} de {ORDER_STEPS.length}:
            </span>{" "}
            <span className="text-ink font-medium">{currentStep.label}</span>
            {followingStep && (
              <span className="text-steel"> · a seguir: {followingStep.label}</span>
            )}
          </p>
          {/* «relative» prende os textos sr-only dentro do recorte do scroll horizontal. */}
          <StepList
            currentLabel="estado atual"
            label="Passos da encomenda"
            orientation="horizontal"
            steps={orderSteps(status)}
            className="border-line relative -mt-4 mb-8 hidden border-b pb-2 md:flex"
          />
        </>
      )}

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[auto_1fr] lg:gap-x-8">
        {/* No telemóvel, o Estado (a ação do ecrã) vem primeiro. */}
        <Section id="estado" title="Estado" className="lg:col-start-2 lg:row-start-1">
          <Panel className="grid gap-4">
            {recentChange && (
              <Notice
                tone="ok"
                title={`Passou a ${STATUS_LABELS[recentChange.toStatus as OrderStatus]}.`}
              >
                O cliente foi avisado por email às {formatTime(recentChange.createdAt)}.
              </Notice>
            )}
            {status ? (
              <StatusForm
                key={status}
                orderId={order.id}
                orderNumber={order.number}
                status={status}
                next={nextStatuses(status)}
              />
            ) : (
              <p className="text-steel text-sm">
                Estado desconhecido ({order.status}). Avise o suporte.
              </p>
            )}
          </Panel>
        </Section>

        <div className="grid content-start gap-12 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <Section id="artigos" title="Artigos" count={items.length}>
            <ol className="bg-surface border-line divide-line-soft divide-y rounded-[2px] border">
              {items.map((item) => {
                const snapshot = item.snapshot as Snapshot;
                const lineNet = item.unitNetCents * item.quantity;
                const lineTotal = lineNet + vatCents(lineNet, vatRate);
                const unitTotal = item.unitNetCents + vatCents(item.unitNetCents, vatRate);
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "grid gap-4 p-5",
                      !singleItem && "md:grid-cols-[minmax(0,1fr)_15rem] md:gap-x-8",
                    )}
                  >
                    <div className="min-w-0">
                      <h3 className="text-ink text-[15px]/[22px] font-semibold">
                        <span className="tabular-nums">{item.quantity} ×</span>{" "}
                        {snapshot.productName}
                      </h3>
                      <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1.5 text-sm">
                        {snapshot.summary.map((choice) => (
                          <div key={choice.key} className="contents">
                            <dt className="text-steel">{choice.name}</dt>
                            <dd className="tabular-nums">{choice.value}</dd>
                          </div>
                        ))}
                        {snapshot.facts.map((fact) => (
                          <div key={fact.label} className="contents">
                            <dt className="text-steel">{fact.label}</dt>
                            <dd className="tabular-nums">{numbers.format(fact.value)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                    {/* Com um só artigo, o preço e a decomposição estão no total, por baixo. */}
                    {!singleItem && (
                      <div className="md:text-right">
                        <p className="text-ink text-base font-semibold tabular-nums">
                          {formatEuros(lineTotal)}
                        </p>
                        <p className="text-steel text-[13px]/[18px]">
                          com IVA · <span className="tabular-nums">{formatEuros(lineNet)}</span> sem
                          IVA
                        </p>
                        {item.quantity > 1 && (
                          <p className="text-steel text-[13px]/[18px] tabular-nums">
                            {item.quantity} × {formatEuros(unitTotal)} com IVA
                          </p>
                        )}
                      </div>
                    )}
                    {!singleItem && snapshot.pricing && (
                      <div className="md:col-span-2">
                        <ItemBreakdown pricing={snapshot.pricing} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>

            <PriceTicket
              title="Total da encomenda"
              size="lg"
              className="mt-4"
              rows={
                onlyItem && singlePricing
                  ? pricingRows(singlePricing, onlyItem.quantity)
                  : items.map((item) => ({
                      label: `${item.quantity} × ${(item.snapshot as Snapshot).productName}`,
                      amountCents: item.unitNetCents * item.quantity,
                    }))
              }
              totals={{
                netCents: order.netCents,
                vatRate: order.vatRate,
                totalCents: order.totalCents,
              }}
              internal={
                totalCost > 0
                  ? { costCents: totalCost, marginCents: order.netCents - totalCost }
                  : undefined
              }
              note={
                <>
                  {onlyItem && onlyItem.quantity > 1 && (
                    <p className="tabular-nums">
                      {onlyItem.quantity} unidades de{" "}
                      {formatEuros(
                        onlyItem.unitNetCents + vatCents(onlyItem.unitNetCents, vatRate),
                      )}{" "}
                      com IVA ({formatEuros(onlyItem.unitNetCents)} sem IVA) cada.
                    </p>
                  )}
                  <p>Transporte e instalação combinam-se à parte com o cliente.</p>
                </>
              }
            />
          </Section>

          <Section id="historico" title="Histórico">
            <Panel className="py-2">
              <ol className="divide-line-soft divide-y">
                {events.length === 0 && (
                  <li className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-x-4">
                    <span className="text-steel text-[13px] tabular-nums sm:text-sm">
                      {formatDateTime(order.createdAt)}
                    </span>
                    <span className="text-sm">Encomenda criada</span>
                  </li>
                )}
                {events.map(({ event, actor, actorName }) => (
                  <li
                    key={event.id}
                    className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-x-4"
                  >
                    <time
                      dateTime={event.createdAt.toISOString()}
                      className="text-steel text-[13px] tabular-nums sm:text-sm sm:leading-6"
                    >
                      {formatDateTime(event.createdAt)}
                    </time>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                        {isOrderStatus(event.toStatus) ? (
                          <OrderStatusBadge status={event.toStatus} />
                        ) : (
                          event.toStatus
                        )}
                        {event.fromStatus === null && <span>Encomenda criada</span>}
                        <span className="text-steel">
                          {actorText(event.actorUserId, actorName, actor)}
                        </span>
                        {event.fromStatus !== null && (
                          <span className="text-steel inline-flex items-center gap-1 text-[13px]">
                            <Mail aria-hidden className="size-3.5" strokeWidth={1.75} />
                            cliente avisado por email
                          </span>
                        )}
                      </p>
                      {event.note && (
                        <p className="text-ink-soft mt-1.5 max-w-prose text-sm whitespace-pre-line">
                          {event.note}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
          </Section>
        </div>

        <Section id="cliente" title="Cliente" className="lg:col-start-2 lg:row-start-2">
          <Panel className="grid gap-5">
            <div className="grid gap-1.5">
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-ink font-medium">{order.billingAddress.name}</span>
                {customer?.role === "pro" && <StatusBadge tone="info">Pro</StatusBadge>}
              </p>
              <p className="text-steel text-[13px]">
                {previousOrders === 0
                  ? "Primeira encomenda deste cliente"
                  : `${previousOrders} ${previousOrders === 1 ? "encomenda anterior" : "encomendas anteriores"}`}
                {customer && isAnonymized(customer.email) && " · conta apagada"}
              </p>
              <Link
                href={`/admin/clientes/${order.userId}`}
                className="link-admin inline-flex w-fit items-center gap-1 text-sm"
              >
                Ver ficha do cliente
                <ArrowRight aria-hidden className="size-4" strokeWidth={1.75} />
              </Link>
            </div>

            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-steel">Email</dt>
              <dd className="min-w-0 truncate">
                <a href={`mailto:${order.email}`} className="link-admin">
                  {order.email}
                </a>
              </dd>
              <dt className="text-steel">Telefone</dt>
              <dd>
                <a href={`tel:${order.phone}`} className="link-admin tabular-nums">
                  {order.phone}
                </a>
              </dd>
              {order.nif && (
                <>
                  <dt className="text-steel">NIF</dt>
                  <dd className="tabular-nums">{order.nif}</dd>
                </>
              )}
            </dl>

            <AddressBlock title="Faturação" address={order.billingAddress} />
            {sameAddress ? (
              <p className="text-steel text-[13px]">Entrega na mesma morada.</p>
            ) : (
              <AddressBlock title="Entrega" address={order.shippingAddress} />
            )}
            {order.notes && (
              <div>
                <h3 className="text-steel text-[13px] font-medium">Notas do cliente</h3>
                <p className="mt-1 text-sm whitespace-pre-line">{order.notes}</p>
              </div>
            )}
            <p className="text-steel-light text-xs">
              Medidas e termos aceites a {formatDateTime(order.measuresAcceptedAt)}.
            </p>
          </Panel>
        </Section>
      </div>
    </PageBody>
  );
}
