import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ArrowUpRight } from "lucide-react";
import { ImageField } from "@/components/admin/image-field";
import { Notice } from "@/components/admin/notice";
import { PageBody } from "@/components/admin/page-body";
import { PageHeader } from "@/components/admin/page-header";
import { CATEGORY_STATUS } from "@/components/admin/status";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/server/auth/session";
import {
  getCategory,
  listCategoryProductCounts,
  listCategoryTree,
} from "@/server/catalog/categories";
import { CategoryEditor, RestoreCategoryButton } from "../forms";

export const metadata: Metadata = { title: "Categoria · Habinox" };

export default async function EditCategoryPage({ params }: PageProps<"/admin/categorias/[id]">) {
  await requireAdmin("/admin/categorias");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [category, roots, all, counts] = await Promise.all([
    getCategory(id),
    listCategoryTree(),
    listCategoryTree({ includeArchived: true }),
    listCategoryProductCounts(),
  ]);
  if (!category) notFound();

  const parent = category.parentId ? all.find((root) => root.id === category.parentId) : undefined;
  const children = roots.find((root) => root.id === category.id)?.children ?? [];
  // Como na loja: uma categoria de topo conta também os produtos das subcategorias.
  const published = [category.id, ...children.map((child) => child.id)].reduce(
    (sum, categoryId) => sum + (counts.get(categoryId)?.published ?? 0),
    0,
  );
  const status = category.archivedAt
    ? CATEGORY_STATUS.arquivada
    : published === 0
      ? CATEGORY_STATUS["sem-produtos"]
      : !category.imageUrl
        ? CATEGORY_STATUS["sem-imagem"]
        : CATEGORY_STATUS.visivel;

  return (
    <PageBody>
      <PageHeader
        crumbs={[
          { href: "/admin/categorias", label: "Categorias" },
          ...(parent ? [{ href: `/admin/categorias/${parent.id}`, label: parent.name.pt }] : []),
        ]}
        title={category.name.pt}
        status={<StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
        meta={
          children.length > 0
            ? `Subcategorias: ${children.map((child) => child.name.pt).join(", ")}`
            : parent
              ? `Subcategoria de ${parent.name.pt}`
              : undefined
        }
        actions={
          !category.archivedAt &&
          published > 0 && (
            <Button asChild variant="ghost">
              <a href={`/pt/loja/${category.slug}`} target="_blank" rel="noopener">
                Ver na loja
                <ArrowUpRight aria-hidden strokeWidth={1.75} />
              </a>
            </Button>
          )
        }
      />

      {category.archivedAt && (
        <Notice
          tone="info"
          title="Esta categoria está arquivada"
          action={<RestoreCategoryButton id={category.id} name={category.name.pt} />}
          className="mb-8"
        >
          Não aparece na loja. Reponha-a para voltar a usá-la.
        </Notice>
      )}

      <CategoryEditor
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
        image={
          <div className="grid gap-4">
            {!category.imageUrl && (
              <Notice tone="warn" title="Falta a imagem">
                Sem ela, a categoria aparece na loja com um cartão vazio. Use uma fotografia larga
                (pelo menos 2400 × 1000 px).
              </Notice>
            )}
            <ImageField
              slot="category"
              id={category.id}
              initialUrl={category.imageUrl}
              initialFocus={category.imageFocus}
              layout="aside"
            />
          </div>
        }
      />
    </PageBody>
  );
}
