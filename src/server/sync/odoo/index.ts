import { env } from "@/env";
import type { ErpClient } from "./client";
import { FakeErpClient } from "./fake";

export type { ErpArticle, ErpClient } from "./client";
export { syncErpMaterials, type SyncSummary } from "./service";

/**
 * Cliente do ERP para este ambiente. Por agora só existe o fake, e só em
 * development: em staging/produção falha em vez de gravar artigos de exemplo.
 * O adaptador Odoo (API JSON-2) entra quando o Bruno tiver o plano Custom.
 */
export function getErpClient(): ErpClient {
  if (env.NEXT_PUBLIC_APP_ENV === "development") return new FakeErpClient();
  throw new Error("ERP não configurado: falta o adaptador Odoo e os acessos");
}
