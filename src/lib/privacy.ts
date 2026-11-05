/**
 * RGPD: regras puras do consentimento comercial e do apagamento de contas.
 * Apagar uma conta = anonimizar: as encomendas têm de ser guardadas 10 anos
 * (obrigação fiscal), por isso ficam; tudo o resto que identifica a pessoa sai.
 */
import type { OrderStatus } from "./orders/state";

/** Estados em que uma encomenda já não precisa do contacto do cliente. */
export const CLOSED_ORDER_STATUSES: readonly OrderStatus[] = ["delivered", "cancelled", "expired"];

const ANONYMIZED_DOMAIN = "apagado.invalid";

/** Email de uma conta anonimizada: único (a coluna é UNIQUE) e impossível de usar. */
export function anonymizedEmail(userId: string): string {
  return `${userId}@${ANONYMIZED_DOMAIN}`;
}

export function isAnonymized(email: string): boolean {
  return email.endsWith(`@${ANONYMIZED_DOMAIN}`);
}

/** Porque é que esta conta não pode ser apagada agora (ou `null` se pode). */
export function erasureBlocker(target: {
  role: string;
  email: string;
  isSelf: boolean;
  openOrders: number;
}): string | null {
  if (target.isSelf) return "Não pode apagar a sua própria conta.";
  if (target.role === "admin") return "Contas de administrador não se apagam aqui.";
  if (isAnonymized(target.email)) return "Esta conta já foi apagada.";
  if (target.openOrders === 1) {
    return "Há 1 encomenda em curso: conclua-a ou cancele-a primeiro.";
  }
  if (target.openOrders > 1) {
    return `Há ${target.openOrders} encomendas em curso: conclua-as ou cancele-as primeiro.`;
  }
  return null;
}

/** O consentimento em vigor é o mais recente (as linhas nunca se alteram). */
export function currentConsent(
  rows: readonly { type: string; granted: boolean; createdAt: Date }[],
  type: string,
): boolean | null {
  let latest: { granted: boolean; createdAt: Date } | null = null;
  for (const row of rows) {
    if (row.type !== type) continue;
    if (!latest || row.createdAt >= latest.createdAt) latest = row;
  }
  return latest?.granted ?? null;
}
