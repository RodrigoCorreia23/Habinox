import type { Metadata } from "next";
import Link from "next/link";
import { formatEuros } from "@/lib/money";
import { isOrderStatus } from "@/lib/orders/state";
import { syncHealth } from "@/lib/sync-health";
import { requireAdmin } from "@/server/auth/session";
import { ACTIVE_ORDER_STATUSES, getDashboard } from "@/server/dashboard";
import { STATUS_LABELS } from "./encomendas/labels";

export const metadata: Metadata = { title: "Painel · Habinox" };

const dateTime = new Intl.DateTimeFormat("pt-PT", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Lisbon",
});

/** O que cada estado pede à Habinox (o painel mostra trabalho, não só números). */
const NEXT_STEP: Record<(typeof ACTIVE_ORDER_STATUSES)[number], string> = {
  pending_payment: "Contactar o cliente para combinar pagamento e transporte",
  paid: "Pôr em produção",
  in_production: "Em fabrico",
  ready: "Combinar a entrega ou a instalação",
};

function Tile({
  href,
  label,
  value,
  hint,
}: {
  href: string;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <Link href={href} className="bg-surface hover:bg-surface-alt block px-4 py-3">
      <span className="text-steel block text-xs">{label}</span>
      <span className="mt-1 block text-2xl font-semibold tabular-nums">{value}</span>
      {hint && <span className="text-steel mt-1 block text-xs">{hint}</span>}
    </Link>
  );
}

export default async function AdminHomePage() {
  await requireAdmin();
  const data = await getDashboard();
  const health = syncHealth({
    lastRunStatus: data.sync.lastRun?.status ?? null,
    lastSuccessAt: data.sync.lastSuccess,
    now: new Date(),
  });

  const alerts: { level: "warn" | "critical"; text: string; href: string; action: string }[] = [];
  if (health.level !== "ok") {
    alerts.push({
      level: health.level,
      text: health.message,
      href: "/admin/materiais",
      action: "Ver sincronizações",
    });
  }
  if (data.materials.missing > 0) {
    alerts.push({
      level: "warn",
      text: `${data.materials.missing} ${data.materials.missing === 1 ? "artigo desapareceu" : "artigos desapareceram"} do ERP e ${data.materials.missing === 1 ? "precisa" : "precisam"} de revisão (mantêm o último custo).`,
      href: "/admin/materiais?atencao=1",
      action: "Rever artigos",
    });
  }
  if (data.materials.noMargin > 0) {
    alerts.push({
      level: "warn",
      text: `${data.materials.noMargin} ${data.materials.noMargin === 1 ? "artigo tem" : "artigos têm"} a margem por decidir: os produtos que os usam não se publicam.`,
      href: "/admin/materiais?atencao=1",
      action: "Definir margens",
    });
  }

  const activeTotal = ACTIVE_ORDER_STATUSES.reduce((sum, s) => sum + (data.orderCounts[s] ?? 0), 0);

  return (
    <main className="grid max-w-5xl gap-10 px-4 py-6 md:px-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Painel</h1>
        <p className="text-steel mt-1 text-sm">
          {health.level === "ok" && data.sync.lastSuccess
            ? `Custos do ERP de ${dateTime.format(data.sync.lastSuccess)}.`
            : "O que precisa de atenção hoje."}
        </p>
      </header>

      {alerts.length > 0 && (
        <section aria-labelledby="atencao" className="grid gap-2">
          <h2 id="atencao" className="sr-only">
            Precisa de atenção
          </h2>
          {alerts.map((alert) => (
            <div
              key={alert.text}
              role={alert.level === "critical" ? "alert" : undefined}
              className={`bg-surface flex flex-wrap items-center justify-between gap-3 border-l-4 px-4 py-3 text-sm ${alert.level === "critical" ? "border-error" : "border-amber"}`}
            >
              <p>{alert.text}</p>
              <Link href={alert.href} className="shrink-0 font-medium underline underline-offset-4">
                {alert.action}
              </Link>
            </div>
          ))}
        </section>
      )}

      <section aria-labelledby="encomendas" className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="encomendas" className="font-semibold">
            Encomendas por tratar{" "}
            <span className="text-steel font-normal tabular-nums">{activeTotal}</span>
          </h2>
          <Link href="/admin/encomendas" className="text-sm underline-offset-4 hover:underline">
            Todas as encomendas
          </Link>
        </div>
        <div className="border-line bg-line grid grid-cols-2 gap-px border md:grid-cols-4">
          {ACTIVE_ORDER_STATUSES.map((status) => (
            <Tile
              key={status}
              href={`/admin/encomendas?estado=${status}`}
              label={STATUS_LABELS[status]}
              value={data.orderCounts[status] ?? 0}
            />
          ))}
        </div>
        {data.recentOrders.length > 0 ? (
          <ul className="border-line bg-surface divide-line-soft divide-y border text-sm">
            {data.recentOrders.map((order) => (
              <li
                key={order.id}
                className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_1fr_auto] sm:items-baseline sm:gap-4"
              >
                <Link
                  href={`/admin/encomendas/${order.id}`}
                  className="font-mono font-medium underline-offset-4 hover:underline"
                >
                  {order.number}
                </Link>
                <span>
                  {order.billingAddress.name}
                  <span className="text-steel block text-xs">
                    {isOrderStatus(order.status) && order.status in NEXT_STEP
                      ? `${STATUS_LABELS[order.status]} · ${NEXT_STEP[order.status as keyof typeof NEXT_STEP]}`
                      : order.status}{" "}
                    · {dateTime.format(order.createdAt)}
                  </span>
                </span>
                <span className="font-mono tabular-nums sm:text-right">
                  {formatEuros(order.totalCents)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-steel border-line bg-surface border px-4 py-6 text-sm">
            Nenhuma encomenda à espera. As novas chegam também por email.
          </p>
        )}
        <p className="text-steel text-xs">
          {data.orderExpiryDays === null
            ? "As encomendas por pagar não expiram sozinhas"
            : `As encomendas por pagar expiram ao fim de ${data.orderExpiryDays} dias`}{" "}
          (
          <Link href="/admin/parametros" className="underline underline-offset-2">
            Parâmetros
          </Link>
          ).
        </p>
      </section>

      <section aria-labelledby="catalogo" className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="catalogo" className="font-semibold">
            Catálogo
          </h2>
          <Link href="/admin/produtos" className="text-sm underline-offset-4 hover:underline">
            Todos os produtos
          </Link>
        </div>
        <div className="border-line bg-line grid grid-cols-2 gap-px border md:grid-cols-4">
          <Tile href="/admin/produtos" label="Na loja" value={data.catalog.published} />
          <Tile
            href="/admin/produtos"
            label="Ainda não publicados"
            value={data.catalog.unpublished}
          />
          <Tile
            href="/admin/produtos"
            label="Alterações por publicar"
            value={data.catalog.pendingChanges}
            hint="Versão nova em rascunho ou validada"
          />
          <Tile href="/admin/produtos" label="Na loja sem imagem" value={data.catalog.noImage} />
        </div>
      </section>
    </main>
  );
}
