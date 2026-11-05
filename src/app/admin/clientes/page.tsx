import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { type Column, DataTable } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/empty-state";
import { FilterTabs } from "@/components/admin/filter-tabs";
import { Missing, Money, RelativeTime } from "@/components/admin/format";
import { PageBody } from "@/components/admin/page-body";
import { PageHeader } from "@/components/admin/page-header";
import { SearchBox } from "@/components/admin/search-box";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { isAnonymized } from "@/lib/privacy";
import { requireAdmin } from "@/server/auth/session";
import { countCustomersByRole, CUSTOMERS_PAGE_SIZE, listCustomers } from "@/server/privacy";
import { CUSTOMER_TYPES, type CustomerType } from "./labels";

export const metadata: Metadata = { title: "Clientes · Habinox" };

/** «Ver mais» junta páginas até este limite (2 000 contas à vista). */
const MAX_PAGES = 40;

type Row = Awaited<ReturnType<typeof listCustomers>>["rows"][number];

function listHref(params: { tipo?: CustomerType; q?: string; pagina?: number }) {
  const search = new URLSearchParams();
  if (params.tipo && params.tipo !== "cliente,pro") search.set("tipo", params.tipo);
  if (params.q) search.set("q", params.q);
  if (params.pagina && params.pagina > 1) search.set("pagina", String(params.pagina));
  const query = search.toString();
  return query ? `/admin/clientes?${query}` : "/admin/clientes";
}

export default async function CustomersPage({ searchParams }: PageProps<"/admin/clientes">) {
  await requireAdmin("/admin/clientes");
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const tipo: CustomerType =
    typeof params.tipo === "string" && Object.hasOwn(CUSTOMER_TYPES, params.tipo)
      ? (params.tipo as CustomerType)
      : "cliente,pro";
  const rawPage = typeof params.pagina === "string" ? Number.parseInt(params.pagina, 10) : 1;
  const page = Number.isFinite(rawPage) ? Math.min(Math.max(rawPage, 1), MAX_PAGES) : 1;

  const [{ rows, total }, byRole] = await Promise.all([
    listCustomers(search, CUSTOMER_TYPES[tipo].roles, page * CUSTOMERS_PAGE_SIZE),
    countCustomersByRole(search),
  ]);
  const countOf = (type: CustomerType) =>
    CUSTOMER_TYPES[type].roles.reduce((sum, role) => sum + (byRole[role] ?? 0), 0);
  const keepQ = search || undefined;

  const columns: Column<Row>[] = [
    {
      key: "nome",
      header: "Nome",
      primary: true,
      // O selo «Pro» é inline-flex: o sublinhado da ligação não passa para ele.
      cell: (row) =>
        row.role === "pro" ? (
          <>
            {row.name}
            <StatusBadge tone="info" className="ml-2 align-middle">
              Pro
            </StatusBadge>
          </>
        ) : (
          row.name
        ),
    },
    {
      key: "email",
      header: "Email",
      mobile: "meta",
      cell: (row) =>
        isAnonymized(row.email) ? (
          <span className="text-steel">Conta apagada</span>
        ) : (
          <span className="inline-grid">
            <span className="truncate">{row.email}</span>
            {!row.emailVerified && (
              <span className="text-steel text-[13px]">email por confirmar</span>
            )}
          </span>
        ),
    },
    {
      key: "telefone",
      header: "Telefone",
      mobile: "meta",
      className: "whitespace-nowrap tabular-nums",
      cell: (row) => row.phone ?? <Missing />,
    },
    {
      key: "cidade",
      header: "Localidade",
      mobile: "meta",
      cell: (row) => row.city ?? <Missing />,
    },
    {
      key: "ultima",
      header: "Última encomenda",
      mobile: "hidden",
      className: "whitespace-nowrap",
      cell: (row) => (row.lastOrderAt ? <RelativeTime date={row.lastOrderAt} /> : <Missing />),
    },
    {
      key: "gasto",
      header: (
        <span title="Encomendas pagas. Não conta as por pagar, canceladas ou expiradas.">
          Total gasto
        </span>
      ),
      align: "right",
      cell: (row) =>
        row.spentCents > 0 ? (
          <Money cents={row.spentCents} />
        ) : (
          <Money cents={0} className="text-steel-light" />
        ),
    },
  ];

  const empty = search ? (
    <EmptyState
      title={`Nenhuma conta encontrada para «${search}».`}
      action={
        <Link href={listHref({ tipo })} className="link-admin">
          Limpar a pesquisa
        </Link>
      }
    >
      Procure pelo nome ou pelo email da conta.
    </EmptyState>
  ) : tipo === "cliente,pro" ? (
    <EmptyState
      title="Ainda não há clientes com conta."
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
      Quem se regista na loja ou faz uma encomenda aparece aqui.
    </EmptyState>
  ) : (
    <EmptyState
      title={`Não há contas ${tipo === "pro" ? "Pro" : "de administrador"}.`}
      action={
        <Link href={listHref({})} className="link-admin">
          Ver os clientes
        </Link>
      }
    >
      {tipo === "pro"
        ? "As contas Pro são de instaladores convidados e compram com desconto."
        : null}
    </EmptyState>
  );

  return (
    <PageBody>
      <PageHeader
        title="Clientes"
        description="Pessoas com conta na loja. Abra uma ficha para ver encomendas e contactos."
      />

      <div className="mb-6 grid gap-4">
        <FilterTabs
          label="Tipo de conta"
          groups={[
            {
              items: (Object.keys(CUSTOMER_TYPES) as CustomerType[]).map((type) => ({
                href: listHref({ tipo: type, q: keepQ }),
                label: CUSTOMER_TYPES[type].label,
                count: countOf(type),
                current: tipo === type,
              })),
            },
          ]}
        />
        <SearchBox
          defaultValue={search}
          placeholder="Nome ou email"
          label="Procurar contas por nome ou email"
          hidden={{ tipo: tipo === "cliente,pro" ? undefined : tipo }}
          resultSummary={`${total} ${total === 1 ? "resultado" : "resultados"} para «${search}»`}
          clearHref={listHref({ tipo })}
        />
      </div>

      <DataTable
        caption="Clientes"
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        rowHref={(row) => `/admin/clientes/${row.id}`}
        empty={empty}
        summary={`A mostrar 1–${rows.length} de ${total}`}
      />

      {rows.length < total && page < MAX_PAGES && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button asChild variant="outline">
            <Link href={listHref({ tipo, q: keepQ, pagina: page + 1 })} scroll={false}>
              Ver mais {Math.min(CUSTOMERS_PAGE_SIZE, total - rows.length)}
            </Link>
          </Button>
          <span className="text-steel text-[13px] tabular-nums">Faltam {total - rows.length}</span>
        </div>
      )}
    </PageBody>
  );
}
