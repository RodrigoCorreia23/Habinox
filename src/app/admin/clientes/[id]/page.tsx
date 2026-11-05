import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { type Column, DataTable } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/empty-state";
import { Missing, Money, RelativeTime } from "@/components/admin/format";
import { Advanced } from "@/components/admin/help";
import { PageBody } from "@/components/admin/page-body";
import { PageHeader } from "@/components/admin/page-header";
import { Panel, Section } from "@/components/admin/section";
import { CONSENT_STATUS } from "@/components/admin/status";
import { OrderStatusBadge, StatusBadge } from "@/components/admin/status-badge";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { isOrderStatus } from "@/lib/orders/state";
import { CLOSED_ORDER_STATUSES, erasureBlocker, isAnonymized } from "@/lib/privacy";
import { requireAdmin } from "@/server/auth/session";
import { getCustomer } from "@/server/privacy";
import { CONSENT_HELP, CONSENT_LABELS } from "../labels";
import { EraseForm } from "./erase-form";

export const metadata: Metadata = { title: "Cliente · Habinox" };

/** Ordem em que os consentimentos aparecem (os outros tipos, se existirem, vêm depois). */
const CONSENT_ORDER = ["marketing", "terms", "measures_responsibility"];

type Customer = NonNullable<Awaited<ReturnType<typeof getCustomer>>>;
type OrderRow = Customer["orders"][number];
type ConsentRow = Customer["consents"][number];

export default async function CustomerPage({ params }: PageProps<"/admin/clientes/[id]">) {
  const { id } = await params;
  const session = await requireAdmin(`/admin/clientes/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();
  const customer = await getCustomer(id);
  if (!customer) notFound();
  const { user, consents, orders, spentCents } = customer;
  const erased = isAnonymized(user.email);
  const openOrders = orders.filter(
    (order) => isOrderStatus(order.status) && !CLOSED_ORDER_STATUSES.includes(order.status),
  ).length;
  const blocker = erasureBlocker({
    role: user.role,
    email: user.email,
    isSelf: user.id === session.user.id,
    openOrders,
  });

  // Contactos: os da encomenda mais recente (a conta só guarda nome e email).
  const latest = orders[0] ?? null;
  const nif = orders.find((order) => order.nif)?.nif ?? null;
  const orderIdByNumber = new Map(orders.map((order) => [order.number, order.id]));

  // Estado em vigor de cada consentimento: a resposta mais recente.
  const currentByType = new Map<string, ConsentRow>();
  for (const consent of consents) {
    const seen = currentByType.get(consent.type);
    if (!seen || consent.createdAt >= seen.createdAt) currentByType.set(consent.type, consent);
  }
  const consentTypes = [
    ...CONSENT_ORDER,
    ...[...currentByType.keys()].filter((type) => !CONSENT_ORDER.includes(type)),
  ];
  const marketing = currentByType.get("marketing") ?? null;

  const sourceText = (source: string): React.ReactNode => {
    if (source.startsWith("order:")) {
      const number = source.slice(6);
      const orderId = orderIdByNumber.get(number);
      return (
        <>
          na encomenda{" "}
          {orderId ? (
            <Link href={`/admin/encomendas/${orderId}`} className="link-admin font-mono">
              {number}
            </Link>
          ) : (
            <span className="font-mono">{number}</span>
          )}
        </>
      );
    }
    if (source === "sign_up") return "no registo";
    if (source === "account") return "na área de cliente";
    if (source === "erasure") return "ao apagar a conta";
    return source;
  };

  const orderColumns: Column<OrderRow>[] = [
    {
      key: "numero",
      header: "Encomenda",
      primary: true,
      cell: (order) => <span className="font-mono text-[13px]">{order.number}</span>,
    },
    {
      key: "data",
      header: "Feita",
      mobile: "meta",
      className: "text-ink-soft whitespace-nowrap",
      cell: (order) => formatDate(order.createdAt),
    },
    {
      key: "estado",
      header: "Estado",
      mobile: "title",
      cell: (order) =>
        isOrderStatus(order.status) ? <OrderStatusBadge status={order.status} /> : order.status,
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (order) => <Money cents={order.totalCents} />,
    },
  ];

  // Numa conta apagada o título já diz «Conta apagada»: sem selo repetido.
  const roleBadge = erased ? undefined : user.role === "pro" ? (
    <StatusBadge tone="info">Pro</StatusBadge>
  ) : user.role === "admin" ? (
    <StatusBadge tone="quiet">Administrador</StatusBadge>
  ) : undefined;

  return (
    <PageBody>
      <PageHeader
        crumbs={[{ href: "/admin/clientes", label: "Clientes" }]}
        title={user.name}
        status={roleBadge}
        description={
          erased
            ? "Conta apagada a pedido do cliente. As encomendas ficam guardadas, como a lei obriga."
            : `Conta criada a ${formatDate(user.createdAt)}.`
        }
        meta={!erased && !user.emailVerified ? "O email ainda não foi confirmado." : undefined}
      />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-x-8">
        {/* Coluna lateral primeiro no HTML: no telemóvel, os contactos aparecem logo. */}
        <div className="grid content-start gap-8 lg:col-start-2 lg:row-start-1">
          <Section id="contacto" title="Contacto">
            {erased ? (
              <p className="text-steel text-sm">
                Os contactos saíram da conta. Ficam só nas encomendas, porque a lei obriga a
                guardá-las.
              </p>
            ) : (
              <Panel className="grid gap-5">
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
                  <dt className="text-steel">Email</dt>
                  <dd className="min-w-0 truncate">
                    {erased ? (
                      <Missing />
                    ) : (
                      <a href={`mailto:${user.email}`} className="link-admin">
                        {user.email}
                      </a>
                    )}
                  </dd>
                  <dt className="text-steel">Telefone</dt>
                  <dd>
                    {latest ? (
                      <a href={`tel:${latest.phone}`} className="link-admin tabular-nums">
                        {latest.phone}
                      </a>
                    ) : (
                      <Missing />
                    )}
                  </dd>
                  <dt className="text-steel">NIF</dt>
                  <dd className="tabular-nums">{nif ?? <Missing />}</dd>
                </dl>

                {latest && (
                  <div>
                    <h3 className="text-steel text-[13px] font-medium">
                      Última morada de faturação
                    </h3>
                    <address className="mt-1 text-sm leading-relaxed not-italic">
                      {latest.billingAddress.name}
                      <br />
                      {latest.billingAddress.line1}
                      {latest.billingAddress.line2 && (
                        <>
                          <br />
                          {latest.billingAddress.line2}
                        </>
                      )}
                      <br />
                      {latest.billingAddress.postalCode} {latest.billingAddress.city}
                    </address>
                  </div>
                )}

                {!erased && (
                  <div className="border-line-soft grid gap-1.5 border-t pt-4">
                    <StatusBadge tone={marketing?.granted ? "ok" : "quiet"} className="w-fit">
                      {marketing === null
                        ? "Ainda não respondeu ao contacto comercial"
                        : marketing.granted
                          ? "Pode receber contacto comercial"
                          : "Não autorizou contacto comercial"}
                    </StatusBadge>
                    <p className="text-steel text-[13px]/[18px]">
                      Ofertas e seguimento de orçamentos só para quem autorizou. Sobre encomendas e
                      pedidos do cliente pode sempre responder.
                    </p>
                  </div>
                )}
              </Panel>
            )}
          </Section>

          <Section id="resumo" title="Resumo">
            <Panel>
              <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 text-sm">
                <dt className="text-steel">Encomendas</dt>
                <dd className="text-right tabular-nums">{orders.length}</dd>
                <dt className="text-steel">
                  <span title="Encomendas pagas. Não conta as por pagar, canceladas ou expiradas.">
                    Total gasto
                  </span>
                </dt>
                <dd className={spentCents > 0 ? "text-right font-medium" : "text-right"}>
                  <Money
                    cents={spentCents}
                    className={spentCents === 0 ? "text-steel-light" : ""}
                  />
                </dd>
                <dt className="text-steel">Última encomenda</dt>
                <dd className="text-right">
                  {latest ? <RelativeTime date={latest.createdAt} /> : <Missing />}
                </dd>
              </dl>
            </Panel>
          </Section>
        </div>

        <div className="grid content-start gap-12 lg:col-start-1 lg:row-start-1">
          <Section id="encomendas" title="Encomendas" count={orders.length}>
            <DataTable
              caption={`Encomendas de ${user.name}`}
              columns={orderColumns}
              rows={orders}
              rowKey={(order) => order.id}
              rowHref={(order) => `/admin/encomendas/${order.id}`}
              empty={
                <EmptyState title="Ainda não fez nenhuma encomenda.">
                  Quando esta pessoa concluir uma compra na loja, a encomenda aparece aqui.
                </EmptyState>
              }
            />
          </Section>

          <Section
            id="consentimentos"
            title="Consentimentos"
            description="O que o cliente autorizou, com a resposta em vigor."
          >
            <Panel className="py-1">
              <ul className="divide-line-soft divide-y">
                {consentTypes.map((type) => {
                  const current = currentByType.get(type);
                  return (
                    <li
                      key={type}
                      className="grid gap-x-6 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    >
                      <div className="min-w-0">
                        <p className="text-ink text-sm font-medium">
                          {CONSENT_LABELS[type] ?? type}
                        </p>
                        {CONSENT_HELP[type] && (
                          <p className="text-steel text-[13px]/[18px]">{CONSENT_HELP[type]}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
                        {current ? (
                          <>
                            <StatusBadge
                              tone={CONSENT_STATUS[current.granted ? "granted" : "denied"].tone}
                            >
                              {CONSENT_STATUS[current.granted ? "granted" : "denied"].label}
                            </StatusBadge>
                            <span className="text-steel text-[13px]">
                              {formatDate(current.createdAt)}, {sourceText(current.source)}
                            </span>
                          </>
                        ) : (
                          <span className="text-steel-light text-[13px]">Sem resposta</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Panel>
            {consents.length > 0 && (
              <Advanced title="Ver histórico de consentimentos" className="mt-3">
                <ol className="grid gap-2">
                  {[...consents].reverse().map((consent) => (
                    <li
                      key={consent.id}
                      className="grid gap-0.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-x-4"
                    >
                      <span className="text-steel tabular-nums">
                        {formatDateTime(consent.createdAt)}
                      </span>
                      <span>
                        {CONSENT_LABELS[consent.type] ?? consent.type}:{" "}
                        <strong className="font-medium">{consent.granted ? "sim" : "não"}</strong>
                        <span className="text-steel"> · {sourceText(consent.source)}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </Advanced>
            )}
          </Section>

          {!erased && (
            <Section id="zona-de-perigo" title="Zona de perigo">
              <div className="border-line rounded-[2px] border border-dashed p-5">
                {blocker ? (
                  <p className="text-steel text-sm">
                    Apagar a conta a pedido do cliente (RGPD) não está disponível:{" "}
                    {blocker.charAt(0).toLowerCase()}
                    {blocker.slice(1)}
                  </p>
                ) : (
                  <div className="grid gap-1">
                    <EraseForm id={user.id} email={user.email} name={user.name} />
                    <p className="text-steel max-w-prose text-[13px]/[18px]">
                      Use só quando o cliente pedir para apagar os dados. As encomendas ficam
                      guardadas; o resto sai e não se desfaz.
                    </p>
                  </div>
                )}
              </div>
            </Section>
          )}
        </div>
      </div>
    </PageBody>
  );
}
