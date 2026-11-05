/**
 * Fronteira com o ERP (Odoo). A loja só lê artigos e custos; nunca escreve.
 * O adaptador real (API JSON-2 do Odoo) entra quando houver acessos; até lá,
 * o fake.
 */
import { z } from "zod";

export interface ErpArticle {
  /** Referência interna. */
  code: string;
  name: string;
  unit: string;
  /** Custo por unidade, sem IVA, em texto decimal ("12.4000"). */
  cost: string;
  /** kg por unidade; null se não estiver preenchido. */
  weightPerUnit: string | null;
  /** Família/categoria no ERP (ex.: "Cores RAL"); null se não tiver. */
  family: string | null;
}

export interface ErpClient {
  readonly source: string;
  /** Todos os artigos da categoria da loja. Falha (lança) se o ERP não responder. */
  listArticles(): Promise<unknown[]>;
}

const decimal4 = z.string().regex(/^\d+(\.\d{1,4})?$/, "Decimal positivo com até 4 casas");

export const erpArticleSchema = z.object({
  code: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  unit: z.string().trim().min(1).max(16),
  cost: decimal4,
  weightPerUnit: decimal4.nullable(),
  // Opcional na resposta (artigos sem família): fica null.
  family: z.string().trim().max(120).nullable().default(null),
}) satisfies z.ZodType<ErpArticle, unknown>;
