import { ORDER_STATUS, ORDER_STATUSES_TO_HANDLE } from "@/components/admin/status";
import type { OrderStatus } from "@/lib/orders/state";

/** Nomes dos estados no backoffice: vêm do mapa único de status.ts (o mesmo texto em todo o lado). */
export const STATUS_LABELS = Object.fromEntries(
  Object.entries(ORDER_STATUS).map(([status, info]) => [status, info.label]),
) as Record<OrderStatus, string>;

/** O nome da ação que leva a cada estado (texto dos botões). */
export const ACTION_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Voltar a aguardar pagamento",
  paid: "Marcar como paga",
  in_production: "Passar a produção",
  ready: "Marcar como pronta",
  shipped: "Marcar como enviada",
  delivered: "Marcar como entregue",
  cancelled: "Cancelar encomenda",
  expired: "Marcar como expirada",
};

/** Passos normais de uma encomenda, pela ordem (a régua no detalhe). */
export const ORDER_STEPS: readonly { status: OrderStatus; label: string }[] = [
  { status: "pending_payment", label: "Aguarda pagamento" },
  { status: "paid", label: "Paga" },
  { status: "in_production", label: "Produção" },
  { status: "ready", label: "Pronta" },
  { status: "shipped", label: "Enviada" },
  { status: "delivered", label: "Entregue" },
];

/** Estados em que a encomenda espera por alguém da oficina (o filtro «Por tratar»). */
export const OPEN_STATUSES: readonly OrderStatus[] = ORDER_STATUSES_TO_HANDLE;

/** Estados de encomendas que já saíram da oficina ou fecharam sem venda. */
export const CLOSED_STATUSES: readonly OrderStatus[] = [
  "shipped",
  "delivered",
  "cancelled",
  "expired",
];

/** Estados em que uma encomenda paga pode ficar parada à espera da oficina. */
export const WAITING_STATUSES: readonly OrderStatus[] = ["paid", "in_production", "ready"];
