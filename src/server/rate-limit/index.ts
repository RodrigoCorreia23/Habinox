/**
 * Limite de pedidos por cliente nas ações públicas da loja.
 * Uma só instrução (INSERT … ON CONFLICT … RETURNING) conta e decide, por isso
 * dois pedidos ao mesmo tempo não passam ambos o limite.
 * Se a BD falhar, o pedido passa (registado no log): o limite protege contra
 * abusos, não pode deitar a loja abaixo.
 */
import { createHmac } from "node:crypto";
import { lt, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db/client";
import { rateLimits } from "@/db/schema";
import { env } from "@/env";
import { log } from "@/lib/log";

export const RATE_LIMITS = {
  // O configurador pede o preço a cada alteração (com 250 ms de atraso).
  quote: { limit: 120, windowSeconds: 60 },
  cart: { limit: 30, windowSeconds: 60 },
  // Por utilizador: cada encomenda envia emails.
  order: { limit: 5, windowSeconds: 600 },
} as const;

export type RateLimitAction = keyof typeof RATE_LIMITS;

/**
 * IP do cliente. Na Vercel o `x-forwarded-for` é reescrito pela plataforma (o
 * primeiro valor é o do cliente), por isso não pode ser falsificado por quem pede.
 */
export function clientIp(requestHeaders: Headers): string {
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || requestHeaders.get("x-real-ip")?.trim() || "unknown";
}

/** O IP é dado pessoal: guarda-se só um HMAC, que não se reverte sem o segredo. */
export function hashSubject(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url").slice(0, 22);
}

/** Conta mais um pedido na janela; `false` quando já passou o limite. */
export async function hit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const expired = sql`${rateLimits.windowStart} <= now() - make_interval(secs => ${windowSeconds})`;
  const [row] = await db
    .insert(rateLimits)
    .values({ key })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${expired} then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${expired} then now() else ${rateLimits.windowStart} end`,
      },
    })
    .returning({ count: rateLimits.count });
  return (row?.count ?? 0) <= limit;
}

/**
 * Pode seguir? O cliente é o id do utilizador quando há sessão obrigatória
 * (`subject`), senão o IP do pedido.
 */
export async function allowRequest(action: RateLimitAction, subject?: string): Promise<boolean> {
  const { limit, windowSeconds } = RATE_LIMITS[action];
  const who = subject ?? `ip:${hashSubject(clientIp(await headers()), env.BETTER_AUTH_SECRET)}`;
  try {
    const allowed = await hit(`${action}:${who}`, limit, windowSeconds);
    if (!allowed) log.warn("rate_limit.blocked", { action, who });
    return allowed;
  } catch (error) {
    log.error("rate_limit.failed", { action, error });
    return true;
  }
}

/** Apaga as janelas já fechadas (job de limpeza). */
export async function deleteExpiredRateLimits(): Promise<number> {
  const longest = Math.max(...Object.values(RATE_LIMITS).map((r) => r.windowSeconds));
  const removed = await db
    .delete(rateLimits)
    .where(lt(rateLimits.windowStart, sql`now() - make_interval(secs => ${longest})`))
    .returning({ key: rateLimits.key });
  return removed.length;
}
