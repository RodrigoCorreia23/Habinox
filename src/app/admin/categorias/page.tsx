import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/server/auth/session";
import { type CategoryRow, listCategoryTree } from "@/server/catalog/categories";
import { RowAction } from "./forms";

export const metadata: Metadata = { title: "Categorias · Habinox" };

function Row({ category, depth }: { category: CategoryRow; depth: 0 | 1 }) {
  return (
    <tr className="border-line-soft border-b last:border-0">
      <td className={`py-3 pr-4 ${depth === 0 ? "pl-4 font-medium" : "pl-10"}`}>
        {depth === 1 && (
          <span className="text-mist mr-2" aria-hidden>
            └
          </span>
        )}
        {category.name.pt}
      </td>
      <td className="text-steel px-4 py-3 text-xs">{category.slug}</td>
      <td className="text-steel px-4 py-3 text-right tabular-nums">{category.position}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center justify-end gap-1">
          {depth === 0 && (
            <Button asChild size="sm" variant="ghost">
              <Link href={`/admin/categorias/nova?pai=${category.id}`}>Nova subcategoria</Link>
            </Button>
          )}
          <Button asChild size="sm" variant="ghost">
            <Link href={`/admin/categorias/${category.id}`}>Editar</Link>
          </Button>
          <RowAction id={category.id} kind="archive" label="Arquivar" />
        </div>
      </td>
    </tr>
  );
}

export default async function CategoriesPage() {
  await requireAdmin("/admin/categorias");
  const [tree, all] = await Promise.all([
    listCategoryTree(),
    listCategoryTree({ includeArchived: true }),
  ]);
  const archived = all
    .flatMap((root) => [root, ...root.children])
    .filter((category) => category.archivedAt);

  return (
    <main className="grid gap-8 px-4 py-6 md:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Categorias</h1>
          <p className="text-steel mt-1 text-sm">
            Dois níveis: categoria (ex.: Portões) e subcategoria (ex.: Portões de correr). Os
            produtos ficam numa subcategoria ou numa categoria sem subcategorias.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/categorias/nova">Nova categoria</Link>
        </Button>
      </header>

      {tree.length === 0 ? (
        <p className="text-steel border-line bg-surface border px-4 py-6 text-sm">
          Ainda não há categorias. Comece por criar uma, por exemplo “Portões”.
        </p>
      ) : (
        <div className="border-line bg-surface overflow-x-auto border">
          <table className="w-full text-sm">
            <thead className="text-steel border-line border-b text-left text-xs">
              <tr>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Endereço</th>
                <th className="px-4 py-2 text-right font-medium">Ordem</th>
                <th className="px-4 py-2">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tree.map((root) => [
                <Row key={root.id} category={root} depth={0} />,
                ...root.children.map((child) => <Row key={child.id} category={child} depth={1} />),
              ])}
            </tbody>
          </table>
        </div>
      )}

      {archived.length > 0 && (
        <section aria-labelledby="arquivadas" className="grid max-w-2xl gap-3">
          <h2 id="arquivadas" className="font-semibold">
            Arquivadas
          </h2>
          <ul className="border-line bg-surface divide-line-soft divide-y border text-sm">
            {archived.map((category) => (
              <li key={category.id} className="flex items-center justify-between gap-4 px-4 py-2">
                <span className="text-steel">{category.name.pt}</span>
                <RowAction id={category.id} kind="restore" label="Repor" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
