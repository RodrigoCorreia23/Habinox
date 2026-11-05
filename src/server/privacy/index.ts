/**
 * RGPD no servidor: consentimento comercial (o cliente muda-o na conta) e
 * apagamento de contas pelo backoffice (anonimização; ver lib/privacy).
 */
import { and, asc, count, desc, eq, ilike, inArray, max, notInArray, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { account, carts, consents, orders, quotes, session, user, verification } from "@/db/schema";
import { log } from "@/lib/log";
import type { OrderStatus } from "@/lib/orders/state";
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

/** Contas por página na lista do backoffice («Ver mais» junta outra página). */
export const CUSTOMERS_PAGE_SIZE = 50;

/** Estados de encomendas já pagas: só estas contam para o «total gasto». */
const PAID_ORDER_STATUSES: readonly OrderStatus[] = [
  "paid",
  "in_production",
  "ready",
  "shipped",
  "delivered",
];

function customerFilter(search: string, roles: readonly string[] | null) {
  const term = search.trim();
  const pattern = `%${term.replace(/[\\%_]/g, "\\$&")}%`;
  return and(
    roles ? inArray(user.role, [...roles]) : undefined,
    term ? or(ilike(user.email, pattern), ilike(user.name, pattern)) : undefined,
  );
}

/**
 * Contas para a lista do backoffice, com o que serve para vender: telefone e
 * localidade da última encomenda, data da última encomenda e total gasto.
 */
export async function listCustomers(
  search: string,
  roles: readonly string[] | null = null,
  limit = CUSTOMERS_PAGE_SIZE,
) {
  const where = customerFilter(search, roles);
  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(where)
      .orderBy(desc(user.createdAt))
      .limit(limit),
    db.select({ n: count() }).from(user).where(where),
  ]);
  const ids = rows.map((row) => row.id);
  const [stats, latest] = ids.length
    ? await Promise.all([
        db
          .select({
            userId: orders.userId,
            n: count(),
            lastAt: max(orders.createdAt),
            spentCents: sql<number>`coalesce(sum(${orders.totalCents}) filter (where ${inArray(
              orders.status,
              [...PAID_ORDER_STATUSES],
            )}), 0)::int`,
          })
          .from(orders)
          .where(inArray(orders.userId, ids))
          .groupBy(orders.userId),
        db
          .selectDistinctOn([orders.userId], {
            userId: orders.userId,
            phone: orders.phone,
            city: sql<string>`${orders.billingAddress}->>'city'`,
          })
          .from(orders)
          .where(inArray(orders.userId, ids))
          .orderBy(orders.userId, desc(orders.createdAt)),
      ])
    : [[], []];
  const statsByUser = new Map(stats.map((row) => [row.userId, row]));
  const latestByUser = new Map(latest.map((row) => [row.userId, row]));
  return {
    total: totalRow?.n ?? 0,
    rows: rows.map((row) => {
      const stat = statsByUser.get(row.id);
      const last = latestByUser.get(row.id);
      return {
        ...row,
        orders: stat?.n ?? 0,
        lastOrderAt: stat?.lastAt ?? null,
        spentCents: stat?.spentCents ?? 0,
        phone: last?.phone ?? null,
        city: last?.city ?? null,
      };
    }),
  };
}

/** Contas por papel (cliente, pro, admin), com a mesma pesquisa da lista. */
export async function countCustomersByRole(search: string) {
  const rows = await db
    .select({ role: user.role, n: count() })
    .from(user)
    .where(customerFilter(search, null))
    .groupBy(user.role);
  return Object.fromEntries(rows.map((row) => [row.role, row.n])) as Record<string, number>;
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
        phone: orders.phone,
        nif: orders.nif,
        billingAddress: orders.billingAddress,
      })
      .from(orders)
      .where(eq(orders.userId, id))
      .orderBy(desc(orders.createdAt)),
  ]);
  const spentCents = orderRows
    .filter((order) => (PAID_ORDER_STATUSES as readonly string[]).includes(order.status))
    .reduce((sum, order) => sum + order.totalCents, 0);
  return { user: found, consents: consentRows, orders: orderRows, spentCents };
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
