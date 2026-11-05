import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { type Column, DataTable } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/empty-state";
import { FilterTabs } from "@/components/admin/filter-tabs";
import { Money, RelativeTime } from "@/components/admin/format";
import { PageBody } from "@/components/admin/page-body";
import { PageHeader } from "@/components/admin/page-header";
import { SearchBox } from "@/components/admin/search-box";
import { OrderStatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { isOrderStatus, type OrderStatus } from "@/lib/orders/state";
import { requireAdmin } from "@/server/auth/session";
import { countOrdersByStatus, listOrders, ORDERS_PAGE_SIZE } from "@/server/orders/admin";
import { CLOSED_STATUSES, OPEN_STATUSES, STATUS_LABELS, WAITING_STATUSES } from "./labels";

export const metadata: Metadata = { title: "Encomendas · Habinox" };

/** «Ver mais» junta páginas até este limite (2 000 encomendas à vista). */
const MAX_PAGES = 40;

type Filter = OrderStatus | "por-tratar" | "todas";
type Row = Awaited<ReturnType<typeof listOrders>>["rows"][number];

function filterHref(params: { estado?: Filter; q?: string; pagina?: number }) {
  const search = new URLSearchParams();
  if (params.estado) search.set("estado", params.estado);
  if (params.q) search.set("q", params.q);
  if (params.pagina && params.pagina > 1) search.set("pagina", String(params.pagina));
  const query = search.toString();
  return query ? `/admin/encomendas?${query}` : "/admin/encomendas";
}

/** Dias inteiros desde a última mudança de estado (encomendas pagas à espera da oficina). */
function daysStill(row: Row) {
  if (!isOrderStatus(row.status) || !WAITING_STATUSES.includes(row.status)) return null;
  return row.daysSinceChange >= 1 ? row.daysSinceChange : null;
}

export default async function OrdersPage({ searchParams }: PageProps<"/admin/encomendas">) {
  await requireAdmin("/admin/encomendas");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const rawEstado = typeof params.estado === "string" ? params.estado : "";
  const explicit: Filter | null =
    rawEstado === "por-tratar" || rawEstado === "todas" || isOrderStatus(rawEstado)
      ? rawEstado
      : null;
  // Abre no trabalho por fazer; uma pesquisa sem filtro procura em todas.
  const filter: Filter = explicit ?? (q ? "todas" : "por-tratar");
  const statuses: readonly OrderStatus[] | null =
    filter === "todas" ? null : filter === "por-tratar" ? OPEN_STATUSES : [filter];
  const rawPage = typeof params.pagina === "string" ? Number.parseInt(params.pagina, 10) : 1;
  const page = Number.isFinite(rawPage) ? Math.min(Math.max(rawPage, 1), MAX_PAGES) : 1;

  const [{ rows, total }, counts] = await Promise.all([
    listOrders({ statuses, search: q, limit: page * ORDERS_PAGE_SIZE }),
    countOrdersByStatus(),
  ]);
  const count = (status: OrderStatus) => counts[status] ?? 0;
  const allOrders = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);
  const toHandle = OPEN_STATUSES.reduce((sum, status) => sum + count(status), 0);
  const keepQ = q || undefined;

  const columns: Column<Row>[] = [
    {
      key: "cliente",
      header: "Cliente",
      primary: true,
      cell: (row) => row.billingAddress.name,
    },
    {
      key: "numero",
      header: "Encomenda",
      mobile: "meta",
      cell: (row) => <span className="text-steel font-mono text-[13px]">{row.number}</span>,
    },
    {
      key: "localidade",
      header: "Localidade",
      mobile: "hidden",
      className: "text-steel",
      cell: (row) => row.billingAddress.city,
    },
    {
      key: "estado",
      header: "Estado",
      mobile: "title",
      cell: (row) =>
        isOrderStatus(row.status) ? <OrderStatusBadge status={row.status} /> : row.status,
    },
    {
      key: "data",
      header: "Feita",
      mobile: "meta",
      cell: (row) => {
        const still = daysStill(row);
        return (
          <span className="inline-grid">
            <RelativeTime date={row.createdAt} className="text-ink-soft whitespace-nowrap" />
            {still !== null && (
              <span className="text-steel text-[13px] whitespace-nowrap">
                parada há {still} {still === 1 ? "dia" : "dias"}
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (row) => <Money cents={row.totalCents} />,
    },
  ];

  const filterName =
    filter === "por-tratar" ? "por tratar" : filter === "todas" ? "" : STATUS_LABELS[filter];

  let empty: React.ReactNode;
  if (allOrders === 0) {
    empty = (
      <EmptyState
        title="Ainda não chegou nenhuma encomenda."
        action={
          <Link
            href="/pt"
            target="_blank"
            rel="noopener"
            className="link-admin inline-flex items-center gap-1"
          >
            Ver a loja
            <ArrowUpRight aria-hidden className="size-4" strokeWidth={1.75} />
          </Link>
        }
      >
        Quando um cliente concluir uma compra na loja, a encomenda aparece aqui e o cliente recebe
        um email.
      </EmptyState>
    );
  } else if (q) {
    empty = (
      <EmptyState
        title={`Nenhuma encomenda encontrada para «${q}»${filterName ? ` em ${filterName}` : ""}.`}
        action={
          <Link href={filterHref({ estado: explicit ?? undefined })} className="link-admin">
            Limpar a pesquisa
          </Link>
        }
        secondary={
          filter !== "todas" ? (
            <Link href={filterHref({ estado: "todas", q })} className="link-admin">
              Procurar em todas
            </Link>
          ) : undefined
        }
      >
        Procure pelo número da encomenda, pelo nome ou email do cliente, ou pelo NIF.
      </EmptyState>
    );
  } else {
    empty = (
      <EmptyState
        title={
          filter === "por-tratar"
            ? "Nenhuma encomenda por tratar."
            : `Nenhuma encomenda ${filterName}.`
        }
        action={
          <Link href={filterHref({ estado: "todas" })} className="link-admin">
            Ver todas
          </Link>
        }
      >
        {filter === "por-tratar" ? "Está tudo em dia. As novas chegam também por email." : null}
      </EmptyState>
    );
  }

  const tab = (estado: Filter, label: string, n: number, attention = false) => ({
    href: filterHref({ estado, q: keepQ }),
    label,
    count: n,
    current: filter === estado,
    attention: attention && n > 0,
  });

  return (
    <PageBody>
      <PageHeader
        title="Encomendas"
        description="Encomendas feitas na loja. Os totais são só dos artigos: transporte e instalação combinam-se com o cliente."
      />

      {allOrders > 0 && (
        <div className="mb-6 grid gap-4">
          <FilterTabs
            label="Filtrar por estado"
            groups={[
              {
                items: [
                  tab("por-tratar", "Por tratar", toHandle, true),
                  ...OPEN_STATUSES.map((status) =>
                    tab(status, STATUS_LABELS[status], count(status), true),
                  ),
                ],
              },
              {
                label: "Fechadas",
                items: CLOSED_STATUSES.map((status) =>
                  tab(status, STATUS_LABELS[status], count(status)),
                ),
              },
              { items: [tab("todas", "Todas", allOrders)] },
            ]}
          />
          <SearchBox
            defaultValue={q}
            placeholder="Número, nome, email ou NIF"
            label="Procurar encomendas por número, nome, email ou NIF"
            hidden={{ estado: explicit ?? undefined }}
            resultSummary={`${total} ${total === 1 ? "resultado" : "resultados"} para «${q}»`}
            clearHref={filterHref({ estado: explicit ?? undefined })}
          />
        </div>
      )}

      <DataTable
        caption="Encomendas"
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        rowHref={(row) => `/admin/encomendas/${row.id}`}
        empty={empty}
        summary={`A mostrar 1–${rows.length} de ${total}`}
      />

      {rows.length < total && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {page < MAX_PAGES ? (
            <Button asChild variant="outline">
              <Link
                href={filterHref({ estado: explicit ?? undefined, q: keepQ, pagina: page + 1 })}
                scroll={false}
              >
                Ver mais {Math.min(ORDERS_PAGE_SIZE, total - rows.length)}
              </Link>
            </Button>
          ) : (
            <p className="text-steel text-[13px]">
              Para encontrar encomendas mais antigas, procure pelo número ou pelo nome.
            </p>
          )}
          <span className="text-steel text-[13px] tabular-nums">Faltam {total - rows.length}</span>
        </div>
      )}
    </PageBody>
  );
}
