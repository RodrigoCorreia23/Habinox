import type { Metadata } from "next";
import { PageBody } from "@/components/admin/page-body";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/server/auth/session";
import { listCategoryTree } from "@/server/catalog/categories";
import { NewCategoryForm } from "../forms";

export const metadata: Metadata = { title: "Nova categoria · Habinox" };

export default async function NewCategoryPage({
  searchParams,
}: PageProps<"/admin/categorias/nova">) {
  await requireAdmin("/admin/categorias/nova");
  const { pai } = await searchParams;
  const roots = await listCategoryTree();
  const parent = typeof pai === "string" ? roots.find((root) => root.id === pai) : undefined;

  return (
    <PageBody width="narrow">
      <PageHeader
        crumbs={[
          { href: "/admin/categorias", label: "Categorias" },
          ...(parent ? [{ href: `/admin/categorias/${parent.id}`, label: parent.name.pt }] : []),
        ]}
        title={parent ? `Nova subcategoria de ${parent.name.pt}` : "Nova categoria"}
        description={
          parent
            ? "Aparece na loja dentro da categoria de cima."
            : "Uma secção da loja. Pode ter subcategorias ou produtos diretamente."
        }
      />
      <NewCategoryForm
        initial={{ name: "", slug: "", description: "", parentId: parent?.id ?? "", position: 0 }}
        parents={roots.map((root) => ({ id: root.id, name: root.name.pt }))}
      />
    </PageBody>
  );
}
