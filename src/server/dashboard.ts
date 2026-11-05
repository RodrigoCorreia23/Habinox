/**
 * Painel do backoffice: o que precisa de atenção hoje e quanto falta para a loja
 * estar montada. Só leituras.
 */
import { listStaleCostOverrides } from "@/server/catalog/cost-overrides";
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  categories,
  formulaLines,
  optionDefinitions,
  orders,
  products,
  productVersions,
  sectors,
  syncRuns,
} from "@/db/schema";
import { countMaterials, lastSuccessfulSync } from "@/server/catalog/materials";
import { countOrdersByStatus } from "@/server/orders/admin";

/** Estados em que a encomenda espera por alguém da Habinox. */
export const ACTIVE_ORDER_STATUSES = ["pending_payment", "paid", "in_production", "ready"] as const;

/**
 * Contagens do catálogo. Cada número tem de dar as mesmas linhas que o filtro da
 * lista de produtos para onde leva (/admin/produtos?estado=…, listProducts):
 * «na-loja» são os publicados SEM alterações por publicar (os outros são
 * «alteracoes») e «sem-imagem» são todos os não arquivados sem imagem,
 * publicados ou não.
 */
async function productAttention() {
  const [counts] = await db
    .select({
      published: sql<number>`count(*) filter (where ${products.publishedVersionId} is not null)::int`,
      unpublished: sql<number>`count(*) filter (where ${products.publishedVersionId} is null)::int`,
      noImage: sql<number>`count(*) filter (where ${products.imageUrl} is null)::int`,
    })
    .from(products)
    .where(isNull(products.archivedAt));
  // Publicados com uma versão nova por publicar (qualquer versão ainda não publicada).
  const pending = await db
    .selectDistinct({ productId: productVersions.productId })
    .from(productVersions)
    .innerJoin(products, eq(products.id, productVersions.productId))
    .where(
      and(
        isNull(products.archivedAt),
        isNotNull(products.publishedVersionId),
        inArray(productVersions.status, ["draft", "validated"]),
      ),
    );
  const published = counts?.published ?? 0;
  return {
    /** Todos os que estão na loja, com ou sem alterações (para «Montar a loja»). */
    published,
    /** Na loja e sem alterações por publicar: o filtro «na-loja». */
    inStore: published - pending.length,
    unpublished: counts?.unpublished ?? 0,
    noImage: counts?.noImage ?? 0,
    pendingChanges: pending.length,
  };
}

/**
 * Contagens de «Montar a loja», direto nas tabelas: categorias, opções por tipo,
 * secções da oficina com e sem margem, produtos com linhas de custo e o produto
 * mais recente que ainda não está na loja (para onde levam os últimos passos).
 */
async function setupCounts() {
  const [categoryRows, optionRows, sectorRows, pricedRows, draftRows] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(categories)
      .where(isNull(categories.archivedAt)),
    db
      .select({ type: optionDefinitions.type, n: sql<number>`count(*)::int` })
      .from(optionDefinitions)
      .where(isNull(optionDefinitions.archivedAt))
      .groupBy(optionDefinitions.type),
    db
      .select({
        total: sql<number>`count(*)::int`,
        withMargin: sql<number>`count(*) filter (where ${sectors.margin} is not null)::int`,
      })
      .from(sectors)
      .where(isNull(sectors.archivedAt)),
    db
      .select({ n: sql<number>`count(distinct ${products.id})::int` })
      .from(formulaLines)
      .innerJoin(productVersions, eq(productVersions.id, formulaLines.productVersionId))
      .innerJoin(products, eq(products.id, productVersions.productId))
      .where(isNull(products.archivedAt)),
    db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(and(isNull(products.archivedAt), isNull(products.publishedVersionId)))
      .orderBy(desc(products.createdAt))
      .limit(1),
  ]);
  const byType = new Map(optionRows.map((row) => [row.type, row.n]));
  const draft = draftRows[0];
  return {
    categories: categoryRows[0]?.n ?? 0,
    options: {
      total: optionRows.reduce((sum, row) => sum + row.n, 0),
      dimensions: byType.get("dimension") ?? 0,
      choices: byType.get("choice") ?? 0,
    },
    sectors: { total: sectorRows[0]?.total ?? 0, withMargin: sectorRows[0]?.withMargin ?? 0 },
    productsWithLines: pricedRows[0]?.n ?? 0,
    productInPreparation: draft ? { id: draft.id, name: draft.name.pt } : null,
  };
}

export async function getDashboard() {
  const [orderCounts, recentOrders, catalog, materials, lastSuccess, lastRun, setup, staleCosts] =
    await Promise.all([
      countOrdersByStatus(),
      db
        .select({
          id: orders.id,
          number: orders.number,
          status: orders.status,
          totalCents: orders.totalCents,
          createdAt: orders.createdAt,
          billingAddress: orders.billingAddress,
        })
        .from(orders)
        .where(inArray(orders.status, [...ACTIVE_ORDER_STATUSES]))
        .orderBy(desc(orders.createdAt))
        .limit(6),
      productAttention(),
      countMaterials(),
      lastSuccessfulSync(),
      db
        .select({ status: syncRuns.status, startedAt: syncRuns.startedAt })
        .from(syncRuns)
        .orderBy(desc(syncRuns.startedAt))
        .limit(1)
        .then((rows) => rows[0] ?? null),
      setupCounts(),
      listStaleCostOverrides(),
    ]);
  return {
    orderCounts,
    recentOrders,
    catalog,
    materials,
    sync: { lastSuccess, lastRun },
    setup,
    staleCosts,
  };
}
