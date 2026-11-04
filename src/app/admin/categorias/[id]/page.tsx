import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/session";
import { getCategory, listCategoryTree } from "@/server/catalog/categories";
import { ImageField } from "@/components/admin/image-field";
import { CategoryForm } from "../forms";

export const metadata: Metadata = { title: "Editar categoria · Habinox" };

export default async function EditCategoryPage({ params }: PageProps<"/admin/categorias/[id]">) {
  await requireAdmin("/admin/categorias");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [category, roots] = await Promise.all([getCategory(id), listCategoryTree()]);
  if (!category || category.archivedAt) notFound();

  return (
    <main className="grid gap-6 px-4 py-6 md:px-6">
      <h1 className="text-xl font-semibold tracking-tight">{category.name.pt}</h1>
      <CategoryForm
        id={category.id}
        initial={{
          name: category.name.pt,
          slug: category.slug,
          description: category.description?.pt ?? "",
          parentId: category.parentId ?? "",
          position: category.position,
        }}
        parents={roots
          .filter((root) => root.id !== category.id)
          .map((root) => ({ id: root.id, name: root.name.pt }))}
      />

      <section
        aria-labelledby="imagem"
        className="border-line bg-surface grid max-w-4xl gap-3 border px-4 py-4"
      >
        <h2 id="imagem" className="font-semibold">
          Imagem
        </h2>
        <ImageField
          slot="category"
          id={category.id}
          initialUrl={category.imageUrl}
          initialFocus={category.imageFocus}
        />
      </section>
    </main>
  );
}
