import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { formatEuros } from "@/lib/money";
import { isOrderStatus } from "@/lib/orders/state";
import { CLOSED_ORDER_STATUSES, currentConsent, erasureBlocker, isAnonymized } from "@/lib/privacy";
import { requireAdmin } from "@/server/auth/session";
import { getCustomer } from "@/server/privacy";
import { STATUS_LABELS } from "../../encomendas/labels";
import { ROLE_LABELS } from "../labels";
import { EraseForm } from "./erase-form";

export const metadata: Metadata = { title: "Cliente · Habinox" };

const dateTime = new Intl.DateTimeFormat("pt-PT", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Lisbon",
});

const CONSENT_LABELS: Record<string, string> = {
  terms: "Termos e privacidade",
  marketing: "Contacto comercial",
  measures_responsibility: "Responsabilidade pelas medidas",
};

const SOURCE_LABELS: Record<string, string> = {
  sign_up: "registo",
  account: "na conta",
  erasure: "conta apagada",
};

function sourceLabel(source: string) {
  if (source.startsWith("order:")) return `encomenda ${source.slice(6)}`;
  return SOURCE_LABELS[source] ?? source;
}

export default async function CustomerPage({ params }: PageProps<"/admin/clientes/[id]">) {
  const { id } = await params;
  const session = await requireAdmin(`/admin/clientes/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();
  const customer = await getCustomer(id);
  if (!customer) notFound();
  const { user, consents, orders } = customer;
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
  const marketing = currentConsent(consents, "marketing");

  return (
    <main className="grid max-w-4xl gap-8 px-4 py-6 md:px-6">
      <header>
        <Link href="/admin/clientes" className="text-steel text-sm hover:underline">
          ← Clientes
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">{user.name}</h1>
        <p className="text-steel mt-1 text-sm">
          {erased ? "Conta apagada" : user.email} · {ROLE_LABELS[user.role] ?? user.role} · registo
          a {dateTime.format(user.createdAt)}
          {!erased && !user.emailVerified && " · email por confirmar"}
        </p>
        {!erased && (
          <p className="mt-2 text-sm">
            Contacto comercial:{" "}
            <strong className="font-medium">
              {marketing === true
                ? "autorizado"
                : marketing === false
                  ? "não autorizado"
                  : "sem resposta"}
            </strong>
          </p>
        )}
      </header>

      <section aria-labelledby="encomendas" className="grid gap-3">
        <h2 id="encomendas" className="font-semibold">
          Encomendas
        </h2>
        {orders.length === 0 ? (
          <p className="text-steel text-sm">Sem encomendas.</p>
        ) : (
          <ul className="border-line bg-surface divide-line-soft divide-y border text-sm">
            {orders.map((order) => (
              <li
                key={order.id}
                className="flex flex-wrap items-baseline justify-between gap-3 px-4 py-2"
              >
                <Link
                  href={`/admin/encomendas/${order.id}`}
                  className="font-mono font-medium underline-offset-4 hover:underline"
                >
                  {order.number}
                </Link>
                <span className="text-steel tabular-nums">{dateTime.format(order.createdAt)}</span>
                <span>
                  {isOrderStatus(order.status) ? STATUS_LABELS[order.status] : order.status}
                </span>
                <span className="font-mono tabular-nums">{formatEuros(order.totalCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="consentimentos" className="grid gap-3">
        <h2 id="consentimentos" className="font-semibold">
          Consentimentos
        </h2>
        {consents.length === 0 ? (
          <p className="text-steel text-sm">Sem registos.</p>
        ) : (
          <ul className="border-line bg-surface divide-line-soft divide-y border text-sm">
            {consents.map((consent) => (
              <li key={consent.id} className="flex flex-wrap justify-between gap-3 px-4 py-2">
                <span>
                  {CONSENT_LABELS[consent.type] ?? consent.type}:{" "}
                  <strong className="font-medium">{consent.granted ? "sim" : "não"}</strong>
                </span>
                <span className="text-steel">
                  {sourceLabel(consent.source)} · {dateTime.format(consent.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!erased && (
        <section aria-labelledby="apagar" className="border-error/40 grid gap-3 border p-4">
          <h2 id="apagar" className="font-semibold">
            Apagar conta
          </h2>
          <p className="text-steel max-w-2xl text-sm">
            Use quando o cliente pedir para apagar os dados (RGPD). O nome e o email saem da conta,
            as sessões terminam e a password é apagada: o cliente deixa de poder entrar. As
            encomendas ficam, com os dados de faturação, porque a lei obriga a guardá-las 10 anos.
            Não se desfaz.
          </p>
          {blocker ? (
            <p className="text-error text-sm">{blocker}</p>
          ) : (
            <EraseForm id={user.id} email={user.email} />
          )}
        </section>
      )}
    </main>
  );
}
