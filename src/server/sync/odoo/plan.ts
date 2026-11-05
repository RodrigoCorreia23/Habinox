/**
 * Decide o que a sincronização muda, sem tocar na BD (testável sem Postgres).
 *
 * Regras (CLAUDE.md):
 * - artigo novo → cria, com o custo inicial no histórico;
 * - custo diferente → atualiza e regista no histórico; igual → não regista nada
 *   (correr duas vezes não duplica);
 * - artigo que desapareceu do ERP → nunca se apaga nem vai a zero: marca-se
 *   para revisão (`erpMissingAt`) e mantém o último custo;
 * - artigo inválido ou repetido no ERP → ignora-se e fica nos erros.
 * A margem nunca entra aqui: é da loja.
 */
import { parseDecimal } from "@/lib/money";
import { erpArticleSchema, type ErpArticle } from "./client";

export interface LocalMaterial {
  id: string;
  erpCode: string;
  name: string;
  unit: string;
  cost: string;
  weightPerUnit: string | null;
  erpFamily: string | null;
  erpMissingAt: Date | null;
}

export interface SyncPlan {
  inserts: ErpArticle[];
  updates: {
    id: string;
    article: ErpArticle;
    costChanged: boolean;
    /** Voltou a aparecer depois de ter desaparecido. */
    returned: boolean;
  }[];
  missing: string[];
  errors: { code?: string; message: string }[];
}

const sameDecimal = (a: string | null, b: string | null) =>
  a === null || b === null ? a === b : parseDecimal(a) === parseDecimal(b);

export function planSync(local: readonly LocalMaterial[], remote: readonly unknown[]): SyncPlan {
  const plan: SyncPlan = { inserts: [], updates: [], missing: [], errors: [] };

  const articles = new Map<string, ErpArticle>();
  const duplicated = new Set<string>();
  for (const raw of remote) {
    const parsed = erpArticleSchema.safeParse(raw);
    if (!parsed.success) {
      const code = (raw as { code?: unknown } | null)?.code;
      plan.errors.push({
        ...(typeof code === "string" && { code }),
        message: `Artigo inválido: ${parsed.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ")}`,
      });
      continue;
    }
    if (articles.has(parsed.data.code)) duplicated.add(parsed.data.code);
    articles.set(parsed.data.code, parsed.data);
  }
  // Com a referência repetida não se sabe qual é o custo certo: não se mexe.
  for (const code of duplicated) {
    articles.delete(code);
    plan.errors.push({ code, message: "Referência repetida no ERP" });
  }

  const localByCode = new Map(local.map((material) => [material.erpCode, material]));

  for (const article of articles.values()) {
    const current = localByCode.get(article.code);
    if (!current) {
      plan.inserts.push(article);
      continue;
    }
    const costChanged = !sameDecimal(current.cost, article.cost);
    const returned = current.erpMissingAt !== null;
    const changed =
      costChanged ||
      returned ||
      current.name !== article.name ||
      current.unit !== article.unit ||
      current.erpFamily !== article.family ||
      !sameDecimal(current.weightPerUnit, article.weightPerUnit);
    if (changed) plan.updates.push({ id: current.id, article, costChanged, returned });
  }

  // Uma resposta vazia é mais provavelmente um erro de configuração (categoria,
  // permissões) do que o fim de todos os artigos: não marcar nada.
  if (articles.size === 0 && local.length > 0) {
    plan.errors.push({
      message: "O ERP não devolveu artigos válidos; nada foi marcado como desaparecido",
    });
    return plan;
  }

  for (const material of local) {
    if (articles.has(material.erpCode) || duplicated.has(material.erpCode)) continue;
    if (material.erpMissingAt === null) plan.missing.push(material.id);
  }

  return plan;
}
