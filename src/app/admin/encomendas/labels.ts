import type { OrderStatus } from "@/lib/orders/state";

/** Nomes dos estados no backoffice e o nome da ação que leva a cada um. */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "A aguardar pagamento",
  paid: "Paga",
  in_production: "Em produção",
  ready: "Pronta",
  shipped: "Enviada",
  delivered: "Entregue",
  cancelled: "Cancelada",
  expired: "Expirada",
};

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
