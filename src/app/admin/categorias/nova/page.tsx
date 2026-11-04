import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth/session";
import { listCategoryTree } from "@/server/catalog/categories";
import { CategoryForm } from "../forms";

export const metadata: Metadata = { title: "Nova categoria · Habinox" };

export default async function NewCategoryPage({
  searchParams,
}: PageProps<"/admin/categorias/nova">) {
  await requireAdmin("/admin/categorias/nova");
  const { pai } = await searchParams;
  const roots = await listCategoryTree();
  const parentId = typeof pai === "string" && roots.some((root) => root.id === pai) ? pai : "";

  return (
    <main className="grid gap-6 px-4 py-6 md:px-6">
      <h1 className="text-xl font-semibold tracking-tight">
        {parentId ? "Nova subcategoria" : "Nova categoria"}
      </h1>
      <CategoryForm
        id={null}
        initial={{ name: "", slug: "", description: "", parentId, position: 0 }}
        parents={roots.map((root) => ({ id: root.id, name: root.name.pt }))}
      />
    </main>
  );
}
