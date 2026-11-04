/**
 * O carrinho do pedido atual: o da conta, se houver sessão, ou o anónimo do
 * cookie. Junta o carrinho anónimo ao da conta quando o cliente entra
 * (decisão em cart-ownership.ts; aqui só se aplica). Idempotente.
 */
import { eq, inArray } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db/client";
import { cartItems, carts } from "@/db/schema";
import { env } from "@/env";
import { log } from "@/lib/log";
import { getSession } from "@/server/auth/session";
import { CART_COOKIE, CART_COOKIE_MAX_AGE, createCart, findCart, newCartToken } from "./cart";
import { planCart } from "./cart-ownership";

export async function getCurrentCart({ create = false } = {}): Promise<{ id: string } | null> {
  const [session, jar] = await Promise.all([getSession(), cookies()]);
  const userId = session?.user.id ?? null;
  const cookieCart = await findCart(jar.get(CART_COOKIE)?.value);
  const userCarts = userId
    ? await db
        .select({ id: carts.id, userId: carts.userId, updatedAt: carts.updatedAt })
        .from(carts)
        .where(eq(carts.userId, userId))
    : [];

  const plan = planCart({ userId, cookieCart, userCarts });
  if (plan.cartId && (plan.attach || plan.mergeFrom.length > 0)) {
    await db.transaction(async (tx) => {
      if (plan.attach) {
        await tx
          .update(carts)
          .set({ userId, updatedAt: new Date() })
          .where(eq(carts.id, plan.attach));
      }
      if (plan.mergeFrom.length > 0) {
        await tx
          .update(cartItems)
          .set({ cartId: plan.cartId! })
          .where(inArray(cartItems.cartId, plan.mergeFrom));
        await tx.delete(carts).where(inArray(carts.id, plan.mergeFrom));
        await tx.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, plan.cartId!));
      }
    });
    log.info("cart.claimed", {
      userId,
      cartId: plan.cartId,
      attached: plan.attach,
      merged: plan.mergeFrom,
    });
  }
  if (plan.cartId) return { id: plan.cartId };
  if (!create) return null;

  // Só em server actions (é preciso gravar o cookie).
  const token = newCartToken();
  const cart = await createCart(token, userId);
  jar.set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE,
  });
  return { id: cart.id };
}
