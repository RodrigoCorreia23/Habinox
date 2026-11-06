/**
 * Produtos e as suas versões. O produto (nome, endereço, categoria) não tem
 * versões; tudo o que mexe no preço (opções usadas, limites, regras, variáveis,
 * linhas) pertence a uma versão: rascunho → validada → publicada.
 * Só se edita o rascunho; uma versão publicada nunca muda (os orçamentos
 * apontam para ela). Para mudar um produto publicado cria-se um rascunho novo,
 * copiado da versão publicada.
 */
import { and, asc, desc, eq, inArray, isNull, max, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import {
  categories,
  formulaLineMaterials,
  formulaLines,
  formulaVariables,
  materials,
  optionDefinitions,
  optionRules,
  optionValues,
  productOptions,
  productOptionValues,
  products,
  productVersions,
  sectors,
} from "@/db/schema";
import type { LocalizedText } from "@/lib/localized";
import { copyCostOverrides } from "./cost-overrides";
import { suggestVarName } from "@/lib/options";
import { SLUG_PATTERN } from "@/lib/slug";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type ProductVersionRow = typeof productVersions.$inferSelect;

/** Estado de um produto na lista (as mesmas chaves do filtro ?estado=). */
export type ProductListStatus = "na-loja" | "alteracoes" | "por-publicar" | "arquivado";

/**
 * Filtros da lista de produtos, vindos da URL. É o contrato com o Painel
 * (?estado=), Materiais (?material=), Mão de obra (?seccao=) e Opções (?opcao=).
 * material, seccao e opcao procuram na versão publicada e na versão em preparação.
 */
export interface ProductFilters {
  estado?: ProductListStatus | "sem-imagem";
  categoria?: string;
  q?: string;
  material?: string;
  seccao?: string;
  opcao?: string;
}

const PRODUCT_LIST_STATUSES = new Set(["na-loja", "alteracoes", "por-publicar", "arquivado"]);

/** Lê os filtros da URL; ignora valores que não fazem sentido (ids que não são uuid, etc.). */
export function parseProductFilters(
  params: Record<string, string | string[] | undefined>,
): ProductFilters {
  const one = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
  };
  const id = (key: string) => {
    const value = one(key);
    return value && z.uuid().safeParse(value).success ? value : undefined;
  };
  const estado = one("estado");
  return {
    estado:
      estado && (PRODUCT_LIST_STATUSES.has(estado) || estado === "sem-imagem")
        ? (estado as ProductFilters["estado"])
        : undefined,
    categoria: id("categoria"),
    q: one("q")?.slice(0, 80),
    material: id("material"),
    seccao: id("seccao"),
    opcao: id("opcao"),
  };
}

const normalizeText = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Produtos cuja versão publicada ou em preparação usa o material, a secção ou a opção. */
async function productIdsUsing(filters: ProductFilters): Promise<Set<string> | null> {
  if (!filters.material && !filters.seccao && !filters.opcao) return null;
  // Versões que contam: a publicada de cada produto e as que ainda não foram publicadas.
  const current = await db
    .select({ id: productVersions.id, productId: productVersions.productId })
    .from(productVersions)
    .innerJoin(products, eq(products.id, productVersions.productId))
    .where(
      sql`${productVersions.status} <> 'published' or ${products.publishedVersionId} = ${productVersions.id}`,
    );
  const productOf = new Map(current.map((row) => [row.id, row.productId]));
  const versionIds = [...productOf.keys()];
  if (versionIds.length === 0) return new Set();
  let matches: Set<string> | null = null;
  const keep = (ids: Iterable<string>) => {
    const found = new Set([...ids].map((versionId) => productOf.get(versionId)!));
    matches = matches ? new Set([...matches].filter((id) => found.has(id))) : found;
  };

  if (filters.material) {
    const direct = await db
      .select({ versionId: formulaLines.productVersionId })
      .from(formulaLines)
      .where(
        and(
          inArray(formulaLines.productVersionId, versionIds),
          eq(formulaLines.materialId, filters.material),
        ),
      );
    const byOption = await db
      .select({ versionId: formulaLines.productVersionId })
      .from(formulaLineMaterials)
      .innerJoin(formulaLines, eq(formulaLines.id, formulaLineMaterials.formulaLineId))
      .where(
        and(
          inArray(formulaLines.productVersionId, versionIds),
          eq(formulaLineMaterials.materialId, filters.material),
        ),
      );
    // Componentes trazidos por um valor de opção (ex.: «Motorizado» soma o kit de motor).
    const byValue = await db
      .select({ versionId: productOptions.productVersionId })
      .from(productOptionValues)
      .innerJoin(productOptions, eq(productOptions.id, productOptionValues.productOptionId))
      .innerJoin(optionValues, eq(optionValues.id, productOptionValues.optionValueId))
      .where(
        and(
          inArray(productOptions.productVersionId, versionIds),
          eq(optionValues.materialId, filters.material),
        ),
      );
    keep([...direct, ...byOption, ...byValue].map((row) => row.versionId));
  }
  if (filters.seccao) {
    const rows = await db
      .select({ versionId: formulaLines.productVersionId })
      .from(formulaLines)
      .where(
        and(
          inArray(formulaLines.productVersionId, versionIds),
          eq(formulaLines.sectorId, filters.seccao),
        ),
      );
    keep(rows.map((row) => row.versionId));
  }
  if (filters.opcao) {
    const rows = await db
      .select({ versionId: productOptions.productVersionId })
      .from(productOptions)
      .where(
        and(
          inArray(productOptions.productVersionId, versionIds),
          eq(productOptions.optionId, filters.opcao),
        ),
      );
    keep(rows.map((row) => row.versionId));
  }
  return matches;
}

export async function listProducts(filters: ProductFilters = {}) {
  const drafts = await db
    .selectDistinct({ productId: productVersions.productId })
    .from(productVersions)
    .where(ne(productVersions.status, "published"));
  const withDraft = new Set(drafts.map((row) => row.productId));
  const published = db
    .select({ id: productVersions.id, version: productVersions.version })
    .from(productVersions)
    .as("published");
  const [rows, using] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        archivedAt: products.archivedAt,
        imageUrl: products.imageUrl,
        imageFocus: products.imageFocus,
        categoryId: products.categoryId,
        category: categories.name,
        categorySlug: categories.slug,
        publishedVersion: published.version,
      })
      .from(products)
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .leftJoin(published, eq(published.id, products.publishedVersionId))
      .orderBy(asc(products.archivedAt), asc(sql`${products.name}->>'pt'`)),
    productIdsUsing(filters),
  ]);
  const words = filters.q ? normalizeText(filters.q).split(/\s+/).filter(Boolean) : [];
  return rows
    .map((row) => {
      const hasDraft = withDraft.has(row.id);
      const status: ProductListStatus = row.archivedAt
        ? "arquivado"
        : row.publishedVersion
          ? hasDraft
            ? "alteracoes"
            : "na-loja"
          : "por-publicar";
      return { ...row, hasDraft, status };
    })
    .filter((row) => {
      if (using && !using.has(row.id)) return false;
      if (filters.categoria && row.categoryId !== filters.categoria) return false;
      if (words.length > 0) {
        const text = normalizeText(`${row.name.pt} ${row.category.pt} ${row.slug}`);
        if (!words.every((word) => text.includes(word))) return false;
      }
      if (filters.estado === "sem-imagem") return !row.imageUrl && !row.archivedAt;
      if (filters.estado) return row.status === filters.estado;
      return true;
    });
}

/** Nomes do material, secção ou opção de um filtro, para o resumo «Produtos que usam …». */
export async function productFilterLabels(filters: ProductFilters) {
  const [material, sector, option, category] = await Promise.all([
    filters.material
      ? db
          .select({ name: materials.name })
          .from(materials)
          .where(eq(materials.id, filters.material))
          .then((rows) => rows[0]?.name ?? null)
      : null,
    filters.seccao
      ? db
          .select({ name: sectors.name })
          .from(sectors)
          .where(eq(sectors.id, filters.seccao))
          .then((rows) => rows[0]?.name ?? null)
      : null,
    filters.opcao
      ? db
          .select({ name: optionDefinitions.name })
          .from(optionDefinitions)
          .where(eq(optionDefinitions.id, filters.opcao))
          .then((rows) => rows[0]?.name.pt ?? null)
      : null,
    filters.categoria
      ? db
          .select({ name: categories.name })
          .from(categories)
          .where(eq(categories.id, filters.categoria))
          .then((rows) => rows[0]?.name.pt ?? null)
      : null,
  ]);
  return { material, sector, option, category };
}

/** Categorias onde pode haver produtos: subcategorias e categorias sem subcategorias. */
export async function listLeafCategories() {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      parentId: categories.parentId,
    })
    .from(categories)
    .where(isNull(categories.archivedAt))
    .orderBy(asc(categories.position));
  const parents = new Set(rows.map((row) => row.parentId).filter(Boolean));
  const byId = new Map(rows.map((row) => [row.id, row]));
  return rows
    .filter((row) => !parents.has(row.id))
    .map((row) => {
      const parent = row.parentId ? byId.get(row.parentId) : undefined;
      return {
        id: row.id,
        label: parent ? `${parent.name.pt} › ${row.name.pt}` : row.name.pt,
        slug: row.slug,
      };
    });
}

export const productInputSchema = z.object({
  name: z.string().trim().min(1, "Escreva o nome").max(120),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(SLUG_PATTERN, "Só minúsculas, números e hífenes (ex.: portao-de-correr)"),
  categoryId: z.uuid("Escolha a categoria"),
  description: z.string().trim().max(5000),
});
export type ProductInput = z.infer<typeof productInputSchema>;

export type Result<F extends string = string> =
  { ok: true; id: string } | { ok: false; field?: F; message: string };

async function checkProduct(
  id: string | null,
  input: ProductInput,
): Promise<Result<keyof ProductInput> | null> {
  const leaves = await listLeafCategories();
  if (!leaves.some((leaf) => leaf.id === input.categoryId)) {
    return {
      ok: false,
      field: "categoryId",
      message: "Escolha uma subcategoria (ou uma categoria sem subcategorias)",
    };
  }
  const [taken] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, input.slug));
  if (taken && taken.id !== id) {
    return { ok: false, field: "slug", message: "Já existe um produto com este endereço" };
  }
  return null;
}

export async function createProduct(
  input: ProductInput,
  userId: string,
): Promise<Result<keyof ProductInput>> {
  const error = await checkProduct(null, input);
  if (error) return error;
  const id = await db.transaction(async (tx) => {
    const [product] = await tx
      .insert(products)
      .values({
        name: { pt: input.name },
        slug: input.slug,
        categoryId: input.categoryId,
        description: input.description ? { pt: input.description } : null,
      })
      .returning({ id: products.id });
    await tx
      .insert(productVersions)
      .values({ productId: product!.id, version: 1, createdBy: userId });
    return product!.id;
  });
  return { ok: true, id };
}

export async function updateProduct(
  id: string,
  input: ProductInput,
): Promise<Result<keyof ProductInput>> {
  const [existing] = await db.select().from(products).where(eq(products.id, id));
  if (!existing) return { ok: false, message: "Produto não encontrado" };
  const error = await checkProduct(id, input);
  if (error) return error;
  const description: LocalizedText | null = input.description
    ? { ...(existing.description ?? {}), pt: input.description }
    : null;
  await db
    .update(products)
    .set({
      name: { ...existing.name, pt: input.name },
      slug: input.slug,
      categoryId: input.categoryId,
      description,
    })
    .where(eq(products.id, id));
  return { ok: true, id };
}

export async function getProduct(id: string) {
  const [product] = await db.select().from(products).where(eq(products.id, id));
  if (!product) return null;
  const versions = await db
    .select()
    .from(productVersions)
    .where(eq(productVersions.productId, id))
    .orderBy(desc(productVersions.version));
  // A versão em edição: o rascunho/validada mais recente, se houver.
  const working = versions.find((version) => version.status !== "published") ?? null;
  const published = versions.find((version) => version.id === product.publishedVersionId) ?? null;
  return { product, versions, working, published };
}

/** Versão editável ou null. Mexer numa versão validada devolve-a a rascunho. */
export async function editableVersion(tx: Tx | typeof db, versionId: string) {
  const [version] = await tx
    .select()
    .from(productVersions)
    .where(eq(productVersions.id, versionId));
  if (!version || version.status === "published") return null;
  if (version.status === "validated") {
    await tx
      .update(productVersions)
      .set({ status: "draft", validatedAt: null })
      .where(eq(productVersions.id, versionId));
  }
  return version;
}

/**
 * Cria um rascunho novo copiado de uma versão (normalmente a publicada).
 * Copia opções, valores permitidos, regras do produto, variáveis e linhas.
 */
export async function createDraftFrom(fromVersionId: string, userId: string): Promise<string> {
  return db.transaction(async (tx) => {
    const [from] = await tx
      .select()
      .from(productVersions)
      .where(eq(productVersions.id, fromVersionId));
    if (!from) throw new Error("Versão não encontrada");
    const [existingDraft] = await tx
      .select({ id: productVersions.id })
      .from(productVersions)
      .where(
        and(
          eq(productVersions.productId, from.productId),
          inArray(productVersions.status, ["draft", "validated"]),
        ),
      );
    if (existingDraft) return existingDraft.id;

    const [{ last } = { last: 0 }] = await tx
      .select({ last: max(productVersions.version) })
      .from(productVersions)
      .where(eq(productVersions.productId, from.productId));
    const [draft] = await tx
      .insert(productVersions)
      .values({
        productId: from.productId,
        version: (last ?? 0) + 1,
        consumablesRate: from.consumablesRate,
        createdBy: userId,
      })
      .returning({ id: productVersions.id });
    const draftId = draft!.id;

    const options = await tx
      .select()
      .from(productOptions)
      .where(eq(productOptions.productVersionId, from.id));
    for (const { id: oldId, productVersionId: _v, ...option } of options) {
      const [copy] = await tx
        .insert(productOptions)
        .values({ ...option, productVersionId: draftId })
        .returning({ id: productOptions.id });
      const values = await tx
        .select()
        .from(productOptionValues)
        .where(eq(productOptionValues.productOptionId, oldId));
      if (values.length > 0) {
        await tx
          .insert(productOptionValues)
          .values(values.map((value) => ({ ...value, productOptionId: copy!.id })));
      }
    }

    const rules = await tx
      .select()
      .from(optionRules)
      .where(eq(optionRules.productVersionId, from.id));
    for (const { id: oldId, ...rule } of rules) {
      const [copy] = await tx
        .insert(optionRules)
        .values({ ...rule, productVersionId: draftId })
        .returning({ id: optionRules.id });
      await copyTranslationStates(tx, "rule.message", oldId, copy!.id);
    }

    const variables = await tx
      .select()
      .from(formulaVariables)
      .where(eq(formulaVariables.productVersionId, from.id));
    for (const { id: oldId, ...variable } of variables) {
      const [copy] = await tx
        .insert(formulaVariables)
        .values({ ...variable, productVersionId: draftId })
        .returning({ id: formulaVariables.id });
      await copyTranslationStates(tx, "variable.label", oldId, copy!.id);
    }

    await copyCostOverrides(tx, from.id, draftId);

    const lines = await tx
      .select()
      .from(formulaLines)
      .where(eq(formulaLines.productVersionId, from.id));
    for (const { id: oldId, ...line } of lines) {
      const [copy] = await tx
        .insert(formulaLines)
        .values({ ...line, productVersionId: draftId })
        .returning({ id: formulaLines.id });
      const mapping = await tx
        .select()
        .from(formulaLineMaterials)
        .where(eq(formulaLineMaterials.formulaLineId, oldId));
      if (mapping.length > 0) {
        await tx
          .insert(formulaLineMaterials)
          .values(mapping.map((row) => ({ ...row, formulaLineId: copy!.id })));
      }
    }
    return draftId;
  });
}

// ── Opções do produto ───────────────────────────────────────────────────────

export async function listVersionOptions(versionId: string) {
  const rows = await db
    .select({ productOption: productOptions, option: optionDefinitions })
    .from(productOptions)
    .innerJoin(optionDefinitions, eq(optionDefinitions.id, productOptions.optionId))
    .where(eq(productOptions.productVersionId, versionId))
    .orderBy(asc(productOptions.position));
  const allowed = rows.length
    ? await db
        .select()
        .from(productOptionValues)
        .where(
          inArray(
            productOptionValues.productOptionId,
            rows.map((row) => row.productOption.id),
          ),
        )
        .orderBy(asc(productOptionValues.position))
    : [];
  const choiceIds = rows.filter((row) => row.option.type === "choice").map((row) => row.option.id);
  const values = choiceIds.length
    ? await db
        .select()
        .from(optionValues)
        .where(inArray(optionValues.optionId, choiceIds))
        .orderBy(asc(optionValues.position))
    : [];
  return rows.map((row) => ({
    ...row,
    allowed: allowed.filter((value) => value.productOptionId === row.productOption.id),
    libraryValues: values.filter((value) => value.optionId === row.option.id),
  }));
}

export async function addOptionToVersion(versionId: string, optionId: string): Promise<Result> {
  return db.transaction(async (tx) => {
    if (!(await editableVersion(tx, versionId))) {
      return { ok: false, message: "Esta versão já não se pode editar" };
    }
    const [option] = await tx
      .select()
      .from(optionDefinitions)
      .where(and(eq(optionDefinitions.id, optionId), isNull(optionDefinitions.archivedAt)));
    if (!option) return { ok: false, message: "Opção não encontrada" };
    const [taken] = await tx
      .select({ id: productOptions.id })
      .from(productOptions)
      .where(
        and(eq(productOptions.productVersionId, versionId), eq(productOptions.optionId, optionId)),
      );
    if (taken) return { ok: false, message: "O produto já usa esta opção" };

    const [{ last } = { last: null }] = await tx
      .select({ last: max(productOptions.position) })
      .from(productOptions)
      .where(eq(productOptions.productVersionId, versionId));
    // Medidas e números: uma letra curta para a fórmula (L, H…), se estiver livre.
    let varName: string | null = null;
    if (option.type === "dimension" || option.type === "number") {
      const others = await tx
        .select({ var: productOptions.var, key: optionDefinitions.key })
        .from(productOptions)
        .innerJoin(optionDefinitions, eq(optionDefinitions.id, productOptions.optionId))
        .where(eq(productOptions.productVersionId, versionId));
      const taken = others.flatMap((row) => (row.var ? [row.var, row.key] : [row.key]));
      varName = suggestVarName(option.name.pt, taken);
    }
    const [created] = await tx
      .insert(productOptions)
      .values({
        productVersionId: versionId,
        optionId,
        position: (last ?? -1) + 1,
        required: option.type !== "boolean",
        var: varName,
      })
      .returning({ id: productOptions.id });

    // Por omissão, todos os valores ativos da biblioteca ficam permitidos.
    if (option.type === "choice") {
      const values = await tx
        .select({ id: optionValues.id })
        .from(optionValues)
        .where(and(eq(optionValues.optionId, optionId), isNull(optionValues.archivedAt)))
        .orderBy(asc(optionValues.position));
      if (values.length > 0) {
        await tx.insert(productOptionValues).values(
          values.map((value, index) => ({
            productOptionId: created!.id,
            optionValueId: value.id,
            position: index,
            isDefault: index === 0,
          })),
        );
      }
    }
    return { ok: true, id: created!.id };
  });
}

const VAR_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

export const productOptionInputSchema = z
  .object({
    var: z
      .string()
      .trim()
      .max(30)
      .refine(
        (value) => value === "" || VAR_PATTERN.test(value),
        "Letras, números e _ (ex.: L, H)",
      ),
    required: z.boolean(),
    min: z.coerce.number().int().min(0).nullable(),
    max: z.coerce.number().int().min(0).nullable(),
    step: z.coerce.number().int().positive().nullable(),
    allowed: z.array(z.uuid()),
    defaultValueId: z.uuid().nullable(),
  })
  .refine((input) => input.min === null || input.max === null || input.min <= input.max, {
    path: ["max"],
    message: "O máximo tem de ser maior ou igual ao mínimo",
  });
export type ProductOptionInput = z.infer<typeof productOptionInputSchema>;

export async function updateVersionOption(
  productOptionId: string,
  input: ProductOptionInput,
): Promise<Result<keyof ProductOptionInput>> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ productOption: productOptions, option: optionDefinitions })
      .from(productOptions)
      .innerJoin(optionDefinitions, eq(optionDefinitions.id, productOptions.optionId))
      .where(eq(productOptions.id, productOptionId));
    if (!row) return { ok: false, message: "Opção do produto não encontrada" };
    if (!(await editableVersion(tx, row.productOption.productVersionId))) {
      return { ok: false, message: "Esta versão já não se pode editar" };
    }
    const varName = input.var === "" ? null : input.var;
    if (varName) {
      const [clash] = await tx
        .select({ id: productOptions.id })
        .from(productOptions)
        .where(
          and(
            eq(productOptions.productVersionId, row.productOption.productVersionId),
            eq(productOptions.var, varName),
          ),
        );
      if (clash && clash.id !== productOptionId) {
        return { ok: false, field: "var", message: "Outra opção já usa este nome na fórmula" };
      }
    }
    // Validar tudo antes de escrever: um erro a meio deixaria a opção meio gravada.
    let library: { id: string; position: number }[] = [];
    if (row.option.type === "choice") {
      if (input.allowed.length === 0) {
        return { ok: false, field: "allowed", message: "Escolha pelo menos um valor" };
      }
      library = await tx
        .select({ id: optionValues.id, position: optionValues.position })
        .from(optionValues)
        .where(
          and(eq(optionValues.optionId, row.option.id), inArray(optionValues.id, input.allowed)),
        );
      if (library.length !== new Set(input.allowed).size) {
        return {
          ok: false,
          field: "allowed",
          message: "Há valores que não pertencem a esta opção",
        };
      }
    }

    const numeric = row.option.type === "dimension" || row.option.type === "number";
    await tx
      .update(productOptions)
      .set({
        var: varName,
        required: input.required,
        min: numeric ? input.min : null,
        max: numeric ? input.max : null,
        step: numeric ? input.step : null,
      })
      .where(eq(productOptions.id, productOptionId));

    if (row.option.type === "choice") {
      const defaultId =
        input.defaultValueId && input.allowed.includes(input.defaultValueId)
          ? input.defaultValueId
          : null;
      await tx
        .delete(productOptionValues)
        .where(eq(productOptionValues.productOptionId, productOptionId));
      await tx.insert(productOptionValues).values(
        library
          .sort((a, b) => a.position - b.position)
          .map((value, index) => ({
            productOptionId,
            optionValueId: value.id,
            position: index,
            isDefault: value.id === defaultId,
          })),
      );
    }
    return { ok: true, id: productOptionId };
  });
}

export async function moveVersionOption(
  productOptionId: string,
  direction: -1 | 1,
): Promise<Result> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(productOptions)
      .where(eq(productOptions.id, productOptionId));
    if (!row) return { ok: false, message: "Opção do produto não encontrada" };
    if (!(await editableVersion(tx, row.productVersionId))) {
      return { ok: false, message: "Esta versão já não se pode editar" };
    }
    const siblings = await tx
      .select({ id: productOptions.id, position: productOptions.position })
      .from(productOptions)
      .where(eq(productOptions.productVersionId, row.productVersionId))
      .orderBy(asc(productOptions.position));
    const index = siblings.findIndex((sibling) => sibling.id === productOptionId);
    const other = siblings[index + direction];
    if (!other) return { ok: true, id: productOptionId };
    // Renumera tudo pela nova ordem (posições sempre 0..n-1).
    const ordered = [...siblings];
    [ordered[index], ordered[index + direction]] = [other, siblings[index]!];
    for (const [position, sibling] of ordered.entries()) {
      await tx.update(productOptions).set({ position }).where(eq(productOptions.id, sibling.id));
    }
    return { ok: true, id: productOptionId };
  });
}

export async function removeVersionOption(productOptionId: string): Promise<Result> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(productOptions)
      .where(eq(productOptions.id, productOptionId));
    if (!row) return { ok: false, message: "Opção do produto não encontrada" };
    if (!(await editableVersion(tx, row.productVersionId))) {
      return { ok: false, message: "Esta versão já não se pode editar" };
    }
    await tx.delete(productOptions).where(eq(productOptions.id, productOptionId));
    return { ok: true, id: productOptionId };
  });
}

/**
 * A cópia de uma regra ou variável leva as traduções no próprio `jsonb`; aqui
 * leva também o estado (automática / revista), para a versão nova não as tratar
 * como desconhecidas.
 */
async function copyTranslationStates(
  tx: Pick<typeof db, "execute">,
  field: string,
  fromId: string,
  toId: string,
) {
  await tx.execute(sql`
    insert into translation_states (field, row_id, locale, source_hash, origin)
    select field, ${toId}, locale, source_hash, origin from translation_states
    where field = ${field} and row_id = ${fromId}
    on conflict do nothing`);
}
