/**
 * RGPD no servidor: consentimento comercial (o cliente muda-o na conta) e
 * apagamento de contas pelo backoffice (anonimização; ver lib/privacy).
 */
import { and, asc, count, desc, eq, ilike, inArray, notInArray, or } from "drizzle-orm";
import { db } from "@/db/client";
import { account, carts, consents, orders, quotes, session, user, verification } from "@/db/schema";
import { log } from "@/lib/log";
import {
  anonymizedEmail,
  CLOSED_ORDER_STATUSES,
  currentConsent,
  erasureBlocker,
} from "@/lib/privacy";

export const MARKETING = "marketing";

export async function getMarketingConsent(userId: string): Promise<boolean | null> {
  const rows = await db
    .select({ type: consents.type, granted: consents.granted, createdAt: consents.createdAt })
    .from(consents)
    .where(and(eq(consents.userId, userId), eq(consents.type, MARKETING)));
  return currentConsent(rows, MARKETING);
}

/** Acrescenta uma resposta (nunca se altera a anterior: fica o histórico). */
export async function setMarketingConsent(userId: string, granted: boolean, source: string) {
  await db.insert(consents).values({ userId, type: MARKETING, granted, source });
}

export async function listCustomers(search: string) {
  const term = search.trim();
  const filter = term
    ? or(ilike(user.email, `%${term}%`), ilike(user.name, `%${term}%`))
    : undefined;
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(filter)
    .orderBy(desc(user.createdAt))
    .limit(200);
  const ids = rows.map((row) => row.id);
  const orderCounts = ids.length
    ? await db
        .select({ userId: orders.userId, n: count() })
        .from(orders)
        .where(inArray(orders.userId, ids))
        .groupBy(orders.userId)
    : [];
  const byUser = new Map(orderCounts.map((row) => [row.userId, row.n]));
  return rows.map((row) => ({ ...row, orders: byUser.get(row.id) ?? 0 }));
}

export async function getCustomer(id: string) {
  const [found] = await db.select().from(user).where(eq(user.id, id));
  if (!found) return null;
  const [consentRows, orderRows] = await Promise.all([
    db.select().from(consents).where(eq(consents.userId, id)).orderBy(asc(consents.createdAt)),
    db
      .select({
        id: orders.id,
        number: orders.number,
        status: orders.status,
        totalCents: orders.totalCents,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.userId, id))
      .orderBy(desc(orders.createdAt)),
  ]);
  return { user: found, consents: consentRows, orders: orderRows };
}

export type EraseResult = { ok: true } | { ok: false; message: string };

/**
 * Apaga a conta (direito ao apagamento): tira nome e email, termina as sessões,
 * apaga a password, os carrinhos e os pedidos de verificação; os orçamentos
 * ficam sem dono (dados de procura). As encomendas ficam como estão, com os
 * dados de faturação, por obrigação fiscal (10 anos).
 */
export async function eraseCustomer(id: string, actorUserId: string): Promise<EraseResult> {
  const result = await db.transaction(async (tx) => {
    const [target] = await tx.select().from(user).where(eq(user.id, id)).for("update");
    if (!target) return { ok: false as const, message: "Conta não encontrada" };
    const [open] = await tx
      .select({ n: count() })
      .from(orders)
      .where(and(eq(orders.userId, id), notInArray(orders.status, [...CLOSED_ORDER_STATUSES])));
    const blocker = erasureBlocker({
      role: target.role,
      email: target.email,
      isSelf: id === actorUserId,
      openOrders: open?.n ?? 0,
    });
    if (blocker) return { ok: false as const, message: blocker };

    await tx.delete(session).where(eq(session.userId, id));
    await tx.delete(account).where(eq(account.userId, id));
    await tx.delete(verification).where(eq(verification.value, id));
    await tx.delete(carts).where(eq(carts.userId, id));
    await tx.update(quotes).set({ userId: null }).where(eq(quotes.userId, id));
    await tx
      .update(user)
      .set({ name: "Conta apagada", email: anonymizedEmail(id), emailVerified: false, image: null })
      .where(eq(user.id, id));
    // Fica registado que deixou de haver autorização para contacto comercial.
    await tx
      .insert(consents)
      .values({ userId: id, type: MARKETING, granted: false, source: "erasure" });
    return { ok: true as const };
  });
  if (result.ok) log.info("user.erased", { userId: id, actorUserId });
  return result;
}
