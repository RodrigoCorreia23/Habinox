import { and, asc, eq } from "drizzle-orm";
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
