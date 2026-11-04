/**
 * Máquina de estados das encomendas (CLAUDE.md). Pura e testada: todas as
 * mudanças de estado passam por aqui, no servidor e no backoffice.
 *
 *   pending_payment → paid → in_production → ready → shipped → delivered
 *   pending_payment → cancelled | expired
 *   paid → cancelled (com reembolso, fora daqui)
 *
 * Um pagamento que chega depois de `expired` (ex.: referência Multibanco paga
 * tarde) não muda o estado sozinho: vai para revisão humana.
 */
export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "in_production",
  "ready",
  "shipped",
  "delivered",
  "cancelled",
  "expired",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ["paid", "cancelled", "expired"],
  paid: ["in_production", "cancelled"],
  in_production: ["ready"],
  ready: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
  expired: [],
};

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function nextStatuses(from: OrderStatus): readonly OrderStatus[] {
  return TRANSITIONS[from];
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export type PaymentOutcome =
  | { action: "mark_paid" }
  | { action: "ignore"; reason: "already_paid" }
  | { action: "review"; reason: "late_payment" | "unexpected_status" };

/** O que fazer quando um pagamento é confirmado (webhook do gateway, fase 1B). */
export function onPaymentConfirmed(status: OrderStatus): PaymentOutcome {
  if (status === "pending_payment") return { action: "mark_paid" };
  if (status === "expired") return { action: "review", reason: "late_payment" };
  if (
    status === "paid" ||
    status === "in_production" ||
    status === "ready" ||
    status === "shipped" ||
    status === "delivered"
  ) {
    // Webhook repetido: idempotente.
    return { action: "ignore", reason: "already_paid" };
  }
  return { action: "review", reason: "unexpected_status" };
}

/** Estados em que o cliente ainda pode cancelar sozinho. */
export function customerCanCancel(status: OrderStatus): boolean {
  return status === "pending_payment";
}
