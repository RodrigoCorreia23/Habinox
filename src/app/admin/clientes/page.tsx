import type { Metadata } from "next";
import Link from "next/link";
import { isAnonymized } from "@/lib/privacy";
import { requireAdmin } from "@/server/auth/session";
import { listCustomers } from "@/server/privacy";
import { ROLE_LABELS } from "./labels";

export const metadata: Metadata = { title: "Clientes · Habinox" };

const date = new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeZone: "Europe/Lisbon" });

export default async function CustomersPage({ searchParams }: PageProps<"/admin/clientes">) {
  await requireAdmin("/admin/clientes");
  const { q } = await searchParams;
  const search = typeof q === "string" ? q.slice(0, 100) : "";
  const rows = await listCustomers(search);

  return (
    <main className="grid gap-6 px-4 py-6 md:px-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Clientes</h1>
        <p className="text-steel mt-1 max-w-3xl text-sm">
          Contas registadas na loja. Na ficha de cada cliente vê os consentimentos e as encomendas,
          e pode apagar a conta a pedido do cliente (RGPD).
        </p>
      </header>

      <form className="flex max-w-md gap-2" role="search">
        <input
          name="q"
          defaultValue={search}
          placeholder="Procurar por nome ou email"
          aria-label="Procurar por nome ou email"
          className="border-line-strong focus-visible:ring-brand/40 h-8 flex-1 rounded-[2px] border bg-white px-2 text-sm outline-none focus-visible:ring-2"
        />
        <button
          type="submit"
          className="border-line-strong hover:bg-surface-alt h-8 rounded-[2px] border bg-white px-3 text-sm"
        >
          Procurar
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="text-steel border-line bg-surface border px-4 py-6 text-sm">
          {search ? "Nenhuma conta encontrada." : "Ainda não há contas."}
        </p>
      ) : (
        <div className="border-line bg-surface overflow-x-auto border">
          <table className="w-full text-sm">
            <thead className="text-steel border-line border-b text-left text-xs">
              <tr>
                <th className="px-4 py-2 font-medium">Cliente</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium">Registo</th>
                <th className="px-4 py-2 text-right font-medium">Encomendas</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-line-soft border-b last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/clientes/${row.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {row.name}
                    </Link>
                    <span className="text-steel block text-xs">
                      {isAnonymized(row.email) ? "conta apagada" : row.email}
                      {!row.emailVerified && !isAnonymized(row.email) && " · email por confirmar"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{ROLE_LABELS[row.role] ?? row.role}</td>
                  <td className="text-steel px-4 py-3 tabular-nums">
                    {date.format(row.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
