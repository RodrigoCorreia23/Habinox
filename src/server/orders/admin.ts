/**
 * Encomendas no backoffice: listar, ver e mudar de estado. Toda a mudança passa
 * pela máquina de estados (lib/orders/state) e fica em order_events.
 */
import { and, asc, count, desc, eq, ilike, inArray, lt, or, type SQL, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { orderEvents, orderItems, orders, user } from "@/db/schema";
import { log } from "@/lib/log";
import { canTransition, isOrderStatus, type OrderStatus } from "@/lib/orders/state";
import { sendEmail } from "@/server/email/send";
import { orderStatusMessage } from "@/server/email/templates";

/** Encomendas por página na lista do backoffice («Ver mais» junta outra página). */
export const ORDERS_PAGE_SIZE = 50;

/** Termo de pesquisa para ILIKE, com % e _ tratados como texto. */
function likePattern(term: string) {
  return `%${term.replace(/[\\%_]/g, "\\$&")}%`;
}

/** Pesquisa por número, nome de faturação, email ou NIF. */
function orderSearch(term: string): SQL | undefined {
  const clean = term.trim();
  if (!clean) return undefined;
  const pattern = likePattern(clean);
  const nifPattern = likePattern(clean.replace(/\s/g, ""));
  return or(
    ilike(orders.number, pattern),
    ilike(orders.email, pattern),
    ilike(sql`${orders.billingAddress}->>'name'`, pattern),
    ilike(orders.nif, nifPattern),
  );
}

/**
 * Lista do backoffice: filtra por estados (null = todas) e pesquisa; devolve as
 * primeiras `limit` linhas e o total, para a página dizer «A mostrar 1–50 de N».
 */
export async function listOrders(params: {
  statuses: readonly OrderStatus[] | null;
  search?: string;
  limit?: number;
}) {
  const { statuses, search = "", limit = ORDERS_PAGE_SIZE } = params;
  const where = and(
    statuses ? inArray(orders.status, [...statuses]) : undefined,
    orderSearch(search),
  );
  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: orders.id,
        number: orders.number,
        status: orders.status,
        totalCents: orders.totalCents,
        email: orders.email,
        billingAddress: orders.billingAddress,
        createdAt: orders.createdAt,
        /** Dias inteiros desde a última mudança de estado. */
        daysSinceChange: sql<number>`floor(extract(epoch from now() - ${orders.updatedAt}) / 86400)::int`,
      })
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(limit),
    db.select({ n: count() }).from(orders).where(where),
  ]);
  return { rows, total: totalRow?.n ?? 0 };
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
  const [items, events, [customer], [previous]] = await Promise.all([
    db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id))
      .orderBy(asc(orderItems.position)),
    db
      .select({
        event: orderEvents,
        actor: user.email,
        actorName: user.name,
        actorRole: user.role,
      })
      .from(orderEvents)
      .leftJoin(user, eq(user.id, orderEvents.actorUserId))
      .where(eq(orderEvents.orderId, id))
      .orderBy(asc(orderEvents.createdAt)),
    db
      .select({ id: user.id, name: user.name, email: user.email, role: user.role })
      .from(user)
      .where(eq(user.id, order.userId)),
    // Encomendas do mesmo cliente feitas antes desta («N encomendas anteriores»).
    db
      .select({ n: count() })
      .from(orders)
      .where(and(eq(orders.userId, order.userId), lt(orders.createdAt, order.createdAt))),
  ]);
  return {
    order,
    items,
    events,
    customer: customer ?? null,
    previousOrders: previous?.n ?? 0,
    /** Hora da leitura (para «há pouco» sem relógio na renderização). */
    readAt: new Date(),
  };
}

export type ChangeResult = { ok: true } | { ok: false; message: string };

export async function changeOrderStatus(params: {
  orderId: string;
  to: OrderStatus;
  /** `null` quando é o sistema (ex.: expiração automática). */
  actorUserId: string | null;
  note: string;
}): Promise<ChangeResult> {
  const { orderId, to, actorUserId, note } = params;
  if (to === "cancelled" && note.trim() === "") {
    return { ok: false, message: "Escreva o motivo do cancelamento: vai no email ao cliente." };
  }

  const result = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!order) return { ok: false as const, message: "Esta encomenda já não existe." };
    const from = order.status;
    if (!isOrderStatus(from) || !canTransition(from, to)) {
      return {
        ok: false as const,
        message:
          "A encomenda mudou de estado entretanto. Atualize a página para ver o estado atual.",
      };
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
