import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/server/auth/session";
import { listProducts } from "@/server/catalog/products";

export const metadata: Metadata = { title: "Produtos · Habinox" };

export default async function ProductsPage() {
  await requireAdmin("/admin/produtos");
  const rows = await listProducts();

  return (
    <main className="grid gap-8 px-4 py-6 md:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Produtos</h1>
          <p className="text-steel mt-1 max-w-3xl text-sm">
            Cada produto junta opções da biblioteca, regras e a fórmula de preço. Só a versão
            publicada aparece na loja; as alterações fazem-se numa versão nova.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/produtos/novo">Novo produto</Link>
        </Button>
      </header>

      {rows.length === 0 ? (
        <p className="text-steel border-line bg-surface border px-4 py-6 text-sm">
          Ainda não há produtos. Antes do primeiro, convém ter a categoria, as opções (medidas,
          material…) e a mão de obra criadas.
        </p>
      ) : (
        <div className="border-line bg-surface overflow-x-auto border">
          <table className="w-full text-sm">
            <thead className="text-steel border-line border-b text-left text-xs">
              <tr>
                <th className="px-4 py-2 font-medium">Produto</th>
                <th className="px-4 py-2 font-medium">Categoria</th>
                <th className="px-4 py-2 font-medium">Na loja</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-line-soft border-b last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/produtos/${row.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {row.name.pt}
                    </Link>
                  </td>
                  <td className="text-steel px-4 py-3">{row.category.pt}</td>
                  <td className="px-4 py-3">
                    {row.archivedAt
                      ? "Arquivado"
                      : row.publishedVersion
                        ? `Publicado (versão ${row.publishedVersion})`
                        : "Ainda não publicado"}
                    {row.hasDraft && row.publishedVersion && (
                      <span className="text-steel ml-2 text-xs">· versão nova em preparação</span>
                    )}
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
