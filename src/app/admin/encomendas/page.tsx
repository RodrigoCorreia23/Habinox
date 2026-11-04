import type { Metadata } from "next";
import Link from "next/link";
import { formatEuros } from "@/lib/money";
import { isOrderStatus, ORDER_STATUSES, type OrderStatus } from "@/lib/orders/state";
import { requireAdmin } from "@/server/auth/session";
import { countOrdersByStatus, listOrders } from "@/server/orders/admin";
import { STATUS_LABELS } from "./labels";

export const metadata: Metadata = { title: "Encomendas · Habinox" };

const dateTime = new Intl.DateTimeFormat("pt-PT", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Lisbon",
});

export default async function OrdersPage({ searchParams }: PageProps<"/admin/encomendas">) {
  await requireAdmin("/admin/encomendas");
  const { estado } = await searchParams;
  const status: OrderStatus | null =
    typeof estado === "string" && isOrderStatus(estado) ? estado : null;
  const [rows, counts] = await Promise.all([listOrders(status), countOrdersByStatus()]);
  const total = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);

  return (
    <main className="grid gap-6 px-4 py-6 md:px-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Encomendas</h1>
        <p className="text-steel mt-1 text-sm">
          Transporte e instalação ainda se combinam com o cliente; os totais são só dos artigos.
        </p>
      </header>

      <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-1 text-sm">
        {[null, ...ORDER_STATUSES].map((value) => {
          const n = value ? (counts[value] ?? 0) : total;
          const current = value === status;
          return (
            <Link
              key={value ?? "todas"}
              href={value ? `/admin/encomendas?estado=${value}` : "/admin/encomendas"}
              aria-current={current ? "page" : undefined}
              className="aria-[current=page]:bg-ink rounded-[2px] px-2.5 py-1 aria-[current=page]:text-white"
            >
              {value ? STATUS_LABELS[value] : "Todas"}{" "}
              <span className="tabular-nums opacity-70">{n}</span>
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <p className="text-steel border-line bg-surface border px-4 py-6 text-sm">
          Sem encomendas.
        </p>
      ) : (
        <div className="border-line bg-surface overflow-x-auto border">
          <table className="w-full text-sm">
            <thead className="text-steel border-line border-b text-left text-xs">
              <tr>
                <th className="px-4 py-2 font-medium">Encomenda</th>
                <th className="px-4 py-2 font-medium">Data</th>
                <th className="px-4 py-2 font-medium">Cliente</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-line-soft border-b last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/encomendas/${row.id}`}
                      className="font-mono font-medium underline-offset-4 hover:underline"
                    >
                      {row.number}
                    </Link>
                  </td>
                  <td className="text-steel px-4 py-3 tabular-nums">
                    {dateTime.format(row.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {row.billingAddress.name}
                    <span className="text-steel block text-xs">
                      {row.email} · {row.billingAddress.city}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isOrderStatus(row.status) ? STATUS_LABELS[row.status] : row.status}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {formatEuros(row.totalCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
