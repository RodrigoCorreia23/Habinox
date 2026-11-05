export const ROLE_LABELS: Record<string, string> = {
  cliente: "Cliente",
  pro: "Pro",
  admin: "Administrador",
};

/** Filtros da lista de clientes (?tipo=): por defeito, clientes e Pro juntos. */
export const CUSTOMER_TYPES = {
  "cliente,pro": { label: "Clientes", roles: ["cliente", "pro"] },
  pro: { label: "Pro", roles: ["pro"] },
  admin: { label: "Administradores", roles: ["admin"] },
} as const satisfies Record<string, { label: string; roles: readonly string[] }>;

export type CustomerType = keyof typeof CUSTOMER_TYPES;

/** Tipos de consentimento, na linguagem do backoffice. */
export const CONSENT_LABELS: Record<string, string> = {
  terms: "Termos e privacidade",
  marketing: "Contacto comercial",
  measures_responsibility: "Responsabilidade pelas medidas",
};

/** O que cada consentimento quer dizer, numa frase. */
export const CONSENT_HELP: Record<string, string> = {
  terms: "Aceitou os termos de venda e a política de privacidade.",
  marketing: "Pode receber ofertas e seguimento de orçamentos por email ou telefone.",
  measures_responsibility: "Assumiu a responsabilidade pelas medidas que indicou.",
};
