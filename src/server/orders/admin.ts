/**
 * Encomendas no backoffice: listar, ver e mudar de estado. Toda a mudança passa
 * pela máquina de estados (lib/orders/state) e fica em order_events.
 */
import { asc, count, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orderEvents, orderItems, orders, user } from "@/db/schema";
import { log } from "@/lib/log";
import { canTransition, isOrderStatus, type OrderStatus } from "@/lib/orders/state";
import { sendEmail } from "@/server/email/send";
import { orderStatusMessage } from "@/server/email/templates";

export async function listOrders(status: OrderStatus | null) {
  return db
    .select({
      id: orders.id,
      number: orders.number,
      status: orders.status,
      totalCents: orders.totalCents,
      email: orders.email,
      billingAddress: orders.billingAddress,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(status ? eq(orders.status, status) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(200);
}

export async function countOrdersByStatus() {
  const rows = await db
    .select({ status: orders.status, n: count() })
    .from(orders)
    .groupBy(orders.status);
  return Object.fromEntries(rows.map((row) => [row.status, row.n])) as Partial<
    Record<OrderStatus, number>
  >;
}

export async function getOrderAdmin(id: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) return null;
  const [items, events] = await Promise.all([
    db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id))
      .orderBy(asc(orderItems.position)),
    db
      .select({ event: orderEvents, actor: user.email })
      .from(orderEvents)
      .leftJoin(user, eq(user.id, orderEvents.actorUserId))
      .where(eq(orderEvents.orderId, id))
      .orderBy(asc(orderEvents.createdAt)),
  ]);
  return { order, items, events };
}

export type ChangeResult = { ok: true } | { ok: false; message: string };

export async function changeOrderStatus(params: {
  orderId: string;
  to: OrderStatus;
  actorUserId: string;
  note: string;
}): Promise<ChangeResult> {
  const { orderId, to, actorUserId, note } = params;
  if (to === "cancelled" && note.trim() === "") {
    return { ok: false, message: "Escreva o motivo do cancelamento" };
  }

  const result = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!order) return { ok: false as const, message: "Encomenda não encontrada" };
    const from = order.status;
    if (!isOrderStatus(from) || !canTransition(from, to)) {
      return { ok: false as const, message: "Essa mudança de estado não é possível" };
    }
    await tx
      .update(orders)
      .set({ status: to, updatedAt: new Date() })
      .where(eq(orders.id, orderId));
    await tx.insert(orderEvents).values({
      orderId,
      fromStatus: from,
      toStatus: to,
      actorUserId,
      note: note.trim() || null,
    });
    return { ok: true as const, order: { ...order, status: to } };
  });
  if (!result.ok) return result;

  log.info("order.status_changed", { orderId, to, actorUserId });
  // Aviso ao cliente; uma falha no email não desfaz a mudança.
  await sendEmail(orderStatusMessage(result.order, to, note.trim())).catch((error: unknown) =>
    log.error("order.status_email_failed", { orderId, error }),
  );
  return { ok: true };
}
