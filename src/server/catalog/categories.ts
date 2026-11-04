import { and, asc, count, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { categories, products } from "@/db/schema";
import type { LocalizedText } from "@/lib/localized";
import { SLUG_PATTERN } from "@/lib/slug";

export type CategoryRow = typeof categories.$inferSelect;

export interface CategoryNode extends CategoryRow {
  children: CategoryRow[];
}

/** Árvore com dois níveis (categoria → subcategoria), pela ordem definida. */
export async function listCategoryTree({ includeArchived = false } = {}): Promise<CategoryNode[]> {
  const rows = await db
    .select()
    .from(categories)
    .where(includeArchived ? undefined : isNull(categories.archivedAt))
    .orderBy(asc(categories.position), asc(categories.createdAt));
  const roots = rows.filter((row) => row.parentId === null);
  return roots.map((root) => ({
    ...root,
    children: rows.filter((row) => row.parentId === root.id),
  }));
}

export async function getCategory(id: string) {
  const [row] = await db.select().from(categories).where(eq(categories.id, id));
  return row ?? null;
}

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Escreva o nome").max(80),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(SLUG_PATTERN, "Só minúsculas, números e hífenes (ex.: portoes-de-correr)"),
  description: z.string().trim().max(2000),
  parentId: z.uuid().nullable(),
  position: z.coerce.number().int().min(0).max(9999),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;

export type SaveResult =
  { ok: true; id: string } | { ok: false; field?: keyof CategoryInput; message: string };

/**
 * Valida a árvore: o pai tem de existir, não estar arquivado e ser de topo
 * (só dois níveis); uma categoria com subcategorias não pode passar a subcategoria.
 */
async function checkParent(id: string | null, parentId: string | null): Promise<SaveResult | null> {
  if (parentId === null) return null;
  if (parentId === id) {
    return {
      ok: false,
      field: "parentId",
      message: "Uma categoria não pode estar dentro de si própria",
    };
  }
  const parent = await getCategory(parentId);
  if (!parent || parent.archivedAt) {
    return { ok: false, field: "parentId", message: "A categoria escolhida já não existe" };
  }
  if (parent.parentId !== null) {
    return {
      ok: false,
      field: "parentId",
      message: "Só há dois níveis: escolha uma categoria de topo",
    };
  }
  if (id) {
    const [children] = await db
      .select({ n: count() })
      .from(categories)
      .where(and(eq(categories.parentId, id), isNull(categories.archivedAt)));
    if ((children?.n ?? 0) > 0) {
      return {
        ok: false,
        field: "parentId",
        message: "Esta categoria tem subcategorias: não pode passar a subcategoria",
      };
    }
  }
  return null;
}

async function slugTaken(slug: string, exceptId: string | null) {
  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      exceptId
        ? and(eq(categories.slug, slug), ne(categories.id, exceptId))
        : eq(categories.slug, slug),
    );
  return Boolean(row);
}

function toColumns(input: CategoryInput) {
  // Por agora só há texto em português; as outras línguas entram na internacionalização.
  const name: LocalizedText = { pt: input.name };
  const description: LocalizedText | null = input.description ? { pt: input.description } : null;
  return {
    name,
    description,
    slug: input.slug,
    parentId: input.parentId,
    position: input.position,
  };
}

export async function saveCategory(id: string | null, input: CategoryInput): Promise<SaveResult> {
  const parentError = await checkParent(id, input.parentId);
  if (parentError) return parentError;
  if (await slugTaken(input.slug, id)) {
    return { ok: false, field: "slug", message: "Já existe uma categoria com este endereço" };
  }

  if (id === null) {
    const [created] = await db
      .insert(categories)
      .values(toColumns(input))
      .returning({ id: categories.id });
    return { ok: true, id: created!.id };
  }

  const existing = await getCategory(id);
  if (!existing) return { ok: false, message: "Categoria não encontrada" };
  // O nome em outras línguas, se já existir, mantém-se.
  const columns = toColumns(input);
  await db
    .update(categories)
    .set({
      ...columns,
      name: { ...existing.name, pt: input.name },
      description: columns.description
        ? { ...(existing.description ?? {}), pt: input.description }
        : null,
    })
    .where(eq(categories.id, id));
  return { ok: true, id };
}

/**
 * Arquivar (nunca apagar: produtos e orçamentos antigos apontam para ela).
 * Só se não tiver subcategorias nem produtos ativos.
 */
export async function archiveCategory(id: string): Promise<{ ok: boolean; message: string }> {
  const [children] = await db
    .select({ n: count() })
    .from(categories)
    .where(and(eq(categories.parentId, id), isNull(categories.archivedAt)));
  if ((children?.n ?? 0) > 0) {
    return { ok: false, message: "Arquive primeiro as subcategorias" };
  }
  const [active] = await db
    .select({ n: count() })
    .from(products)
    .where(and(eq(products.categoryId, id), isNull(products.archivedAt)));
  if ((active?.n ?? 0) > 0) {
    return { ok: false, message: "Tem produtos: mude-os de categoria ou arquive-os primeiro" };
  }
  await db.update(categories).set({ archivedAt: new Date() }).where(eq(categories.id, id));
  return { ok: true, message: "Arquivada" };
}

export async function restoreCategory(id: string): Promise<{ ok: boolean; message: string }> {
  const category = await getCategory(id);
  if (!category) return { ok: false, message: "Categoria não encontrada" };
  if (category.parentId) {
    const parent = await getCategory(category.parentId);
    if (parent?.archivedAt) return { ok: false, message: "Reponha primeiro a categoria de cima" };
  }
  await db.update(categories).set({ archivedAt: null }).where(eq(categories.id, id));
  return { ok: true, message: "Reposta" };
}
