import { and, asc, count, eq, isNotNull, isNull, max, ne } from "drizzle-orm";
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

export interface CategoryProductCounts {
  /** Produtos publicados (os que a loja mostra). */
  published: number;
  /** Produtos ativos ainda sem versão publicada. */
  unpublished: number;
}

/**
 * Produtos ativos por categoria (só a própria, sem as subcategorias), separados
 * entre publicados e por publicar. A loja só mostra uma categoria com publicados.
 */
export async function listCategoryProductCounts(): Promise<Map<string, CategoryProductCounts>> {
  const rows = await db
    .select({
      categoryId: products.categoryId,
      published: isNotNull(products.publishedVersionId).mapWith(Boolean),
      n: count(),
    })
    .from(products)
    .where(isNull(products.archivedAt))
    .groupBy(products.categoryId, isNotNull(products.publishedVersionId));
  const counts = new Map<string, CategoryProductCounts>();
  for (const row of rows) {
    const entry = counts.get(row.categoryId) ?? { published: 0, unpublished: 0 };
    if (row.published) entry.published += row.n;
    else entry.unpublished += row.n;
    counts.set(row.categoryId, entry);
  }
  return counts;
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

const siblingsOf = (parentId: string | null) =>
  parentId ? eq(categories.parentId, parentId) : isNull(categories.parentId);

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
    // Uma categoria nova fica no fim das irmãs (a ordem muda-se na lista com ↑↓).
    const [{ last } = { last: null }] = await db
      .select({ last: max(categories.position) })
      .from(categories)
      .where(siblingsOf(input.parentId));
    const [created] = await db
      .insert(categories)
      .values({ ...toColumns(input), position: (last ?? -1) + 1 })
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

/**
 * Sobe ou desce uma categoria entre as irmãs (mesmo pai, não arquivadas).
 * Regrava as posições 0, 1, 2… pela ordem da lista, por isso também arruma
 * posições repetidas (ex.: todas a 0).
 */
export async function moveCategory(
  id: string,
  direction: "up" | "down",
): Promise<{ ok: boolean; message: string }> {
  return db.transaction(async (tx) => {
    const [category] = await tx.select().from(categories).where(eq(categories.id, id));
    if (!category || category.archivedAt) return { ok: false, message: "Categoria não encontrada" };
    const siblings = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(and(siblingsOf(category.parentId), isNull(categories.archivedAt)))
      .orderBy(asc(categories.position), asc(categories.createdAt));
    const order = siblings.map((row) => row.id);
    const from = order.indexOf(id);
    const to = direction === "up" ? from - 1 : from + 1;
    if (from < 0 || to < 0 || to >= order.length) return { ok: true, message: "Sem alterações" };
    [order[from], order[to]] = [order[to]!, order[from]!];
    for (const [position, siblingId] of order.entries()) {
      await tx.update(categories).set({ position }).where(eq(categories.id, siblingId));
    }
    return { ok: true, message: "Ordem guardada" };
  });
}
