/**
 * Painel do backoffice: o que precisa de atenção hoje. Só leituras.
 */
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, products, productVersions, syncRuns } from "@/db/schema";
import { countMaterials, lastSuccessfulSync } from "@/server/catalog/materials";
import { countOrdersByStatus } from "@/server/orders/admin";
import { getSetting } from "@/server/settings";

/** Estados em que a encomenda espera por alguém da Habinox. */
export const ACTIVE_ORDER_STATUSES = ["pending_payment", "paid", "in_production", "ready"] as const;

async function productAttention() {
  const [counts] = await db
    .select({
      published: sql<number>`count(*) filter (where ${products.publishedVersionId} is not null)::int`,
      unpublished: sql<number>`count(*) filter (where ${products.publishedVersionId} is null)::int`,
      noImage: sql<number>`count(*) filter (where ${products.publishedVersionId} is not null and ${products.imageUrl} is null)::int`,
    })
    .from(products)
    .where(isNull(products.archivedAt));
  // Publicados com uma versão nova por publicar (rascunho ou validada).
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
  return {
    published: counts?.published ?? 0,
    unpublished: counts?.unpublished ?? 0,
    noImage: counts?.noImage ?? 0,
    pendingChanges: pending.length,
  };
}

export async function getDashboard() {
  const [orderCounts, recentOrders, catalog, materials, lastSuccess, lastRun, expiry] =
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
      getSetting("order_expiry_days"),
    ]);
  return {
    orderCounts,
    recentOrders,
    catalog,
    materials,
    sync: { lastSuccess, lastRun },
    orderExpiryDays: expiry.days,
  };
}
