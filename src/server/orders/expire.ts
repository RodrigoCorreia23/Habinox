/**
 * Expiração automática das encomendas por pagar (job `expire-orders`).
 * Cada encomenda passa pela máquina de estados como uma mudança feita no
 * backoffice (evento + email ao cliente), sem autor. Idempotente: uma
 * encomenda que já mudou de estado deixa de ser escolhida.
 */
import { and, asc, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import type { Logger } from "@/lib/log";
import { getSetting } from "@/server/settings";
import { changeOrderStatus } from "./admin";

/** Por execução: o resto fica para a seguinte (o job não pode exceder o tempo da função). */
const BATCH = 200;

export async function expireStaleOrders(
  log: Logger,
): Promise<{ expired: number; failed: number; disabled: boolean }> {
  const { days } = await getSetting("order_expiry_days");
  if (days === null) return { expired: 0, failed: 0, disabled: true };

  const stale = await db
    .select({ id: orders.id, number: orders.number })
    .from(orders)
    .where(
      and(
        eq(orders.status, "pending_payment"),
        lt(orders.createdAt, sql`now() - make_interval(days => ${days})`),
      ),
    )
    .orderBy(asc(orders.createdAt))
    .limit(BATCH);

  let expired = 0;
  let failed = 0;
  for (const order of stale) {
    const result = await changeOrderStatus({
      orderId: order.id,
      to: "expired",
      actorUserId: null,
      note: `Expirada automaticamente: sem pagamento em ${days} dias.`,
    });
    if (result.ok) expired++;
    else {
      // Mudou de estado entretanto (ex.: paga no backoffice): não é erro.
      failed++;
      log.warn("order.expire_skipped", { orderId: order.id, reason: result.message });
    }
  }
  return { expired, failed, disabled: false };
}
