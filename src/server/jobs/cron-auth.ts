import { timingSafeEqual } from "node:crypto";

/**
 * A Vercel Cron envia `Authorization: Bearer <CRON_SECRET>`.
 * Comparação em tempo constante para não revelar o segredo por timing.
 */
export function isAuthorizedCronRequest(authorization: string | null, secret: string): boolean {
  if (!authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  if (received.length !== expected.length) return false;
  return timingSafeEqual(received, expected);
}
