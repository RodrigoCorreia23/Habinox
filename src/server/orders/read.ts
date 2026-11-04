import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { orderItems, orders } from "@/db/schema";

/** Encomenda pelo número, só se pertencer ao utilizador (senão null, como se não existisse). */
export async function getOrderForUser(number: string, userId: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.number, number), eq(orders.userId, userId)));
  if (!order) return null;
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .orderBy(asc(orderItems.position));
  return { order, items };
}

/** Encomendas do cliente, da mais recente para a mais antiga. */
export async function listOrdersForUser(userId: string) {
  const rows = await db
    .select({
      id: orders.id,
      number: orders.number,
      status: orders.status,
      totalCents: orders.totalCents,
      createdAt: orders.createdAt,
      items: sql<number>`(select coalesce(sum(oi.quantity), 0)::int from order_items oi where oi.order_id = "orders"."id")`,
    })
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
  return rows;
}
