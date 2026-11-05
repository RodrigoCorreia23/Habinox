/**
 * Mapas únicos de estado → {rótulo, tom} do backoffice (DESIGN.md › Backoffice › Estados).
 * Todas as páginas usam estes textos: o mesmo estado diz-se sempre da mesma maneira.
 */
import type { OrderStatus } from "@/lib/orders/state";

export type StatusTone = "ok" | "warn" | "danger" | "info" | "quiet" | "draft";
export type StatusInfo = { label: string; tone: StatusTone };

export const ORDER_STATUS: Record<OrderStatus, StatusInfo> = {
  pending_payment: { label: "A aguardar pagamento", tone: "warn" },
  paid: { label: "Paga", tone: "info" },
  in_production: { label: "Em produção", tone: "info" },
  ready: { label: "Pronta", tone: "info" },
  shipped: { label: "Enviada", tone: "quiet" },
  delivered: { label: "Entregue", tone: "quiet" },
  cancelled: { label: "Cancelada", tone: "danger" },
  expired: { label: "Expirada", tone: "danger" },
};

/** Estados em que a encomenda espera por alguém da oficina (contagem da navegação). */
export const ORDER_STATUSES_TO_HANDLE = [
  "pending_payment",
  "paid",
  "in_production",
  "ready",
] as const satisfies readonly OrderStatus[];

export type VersionStatus = "draft" | "validated" | "published";
export const VERSION_STATUS: Record<VersionStatus, StatusInfo> = {
  draft: { label: "Em preparação", tone: "draft" },
  validated: { label: "Pronta a publicar", tone: "info" },
  published: { label: "Na loja", tone: "ok" },
};

/** Estado de um produto na lista (o filtro ?estado= usa as mesmas chaves). */
export const PRODUCT_STATUS = {
  "na-loja": { label: "Na loja", tone: "ok" },
  alteracoes: { label: "Alterações por publicar", tone: "warn" },
  "por-publicar": { label: "Ainda não publicado", tone: "quiet" },
  arquivado: { label: "Arquivado", tone: "quiet" },
} as const satisfies Record<string, StatusInfo>;

export const MATERIAL_STATUS = {
  "sem-margem": { label: "Falta margem", tone: "danger" },
  desaparecido: { label: "Deixou de existir no ERP", tone: "warn" },
} as const satisfies Record<string, StatusInfo>;

/** Sincronização com o ERP, pelo estado gravado em sync_runs. */
export const SYNC_STATUS = {
  succeeded: { label: "Correu bem", tone: "ok" },
  partial: { label: "Com avisos", tone: "warn" },
  failed: { label: "Falhou", tone: "danger" },
  running: { label: "A decorrer", tone: "quiet" },
} as const satisfies Record<string, StatusInfo>;

export const TRANSLATION_STATUS = {
  missing: { label: "Por traduzir", tone: "quiet" },
  machine: { label: "Automática", tone: "quiet" },
  reviewed: { label: "Revista", tone: "ok" },
  stale: { label: "O português mudou", tone: "warn" },
} as const satisfies Record<string, StatusInfo>;

export const CONSENT_STATUS = {
  granted: { label: "Sim", tone: "ok" },
  denied: { label: "Não", tone: "quiet" },
} as const satisfies Record<string, StatusInfo>;

export const CATEGORY_STATUS = {
  visivel: { label: "Visível", tone: "ok" },
  "sem-produtos": { label: "Sem produtos", tone: "quiet" },
  "sem-imagem": { label: "Sem imagem", tone: "warn" },
  arquivada: { label: "Arquivada", tone: "quiet" },
} as const satisfies Record<string, StatusInfo>;
