"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { log } from "@/lib/log";
import { setFlash } from "@/server/admin/flash";
import { requireAdmin } from "@/server/auth/session";
import { translateInBackground } from "@/server/catalog/translations";
import { removeRule, ruleInputSchema, saveRule } from "@/server/catalog/rules";

export type RuleFormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
} | null;

/** Onde a regra vive: num rascunho de produto ou na biblioteca. */
export type RuleScope = { productId: string; versionId: string } | null;

const uuid = z.uuid();
const pathOf = (scope: RuleScope) =>
  scope ? `/admin/produtos/${scope.productId}` : "/admin/opcoes/regras";

export async function saveRuleAction(
  scope: RuleScope,
  ruleId: string | null,
  _previous: RuleFormState,
  formData: FormData,
): Promise<RuleFormState> {
  const session = await requireAdmin(pathOf(scope));
  if (scope && !uuid.safeParse(scope.versionId).success)
    return { ok: false, message: "Pedido inválido" };
  let conditions: unknown;
  try {
    conditions = JSON.parse(String(formData.get("conditions") || "[]"));
  } catch {
    return { ok: false, message: "Pedido inválido" };
  }
  // Uma regra sem condições vale sempre: tem de ser confirmada de propósito.
  if (
    Array.isArray(conditions) &&
    conditions.length === 0 &&
    formData.get("allProducts") !== "on"
  ) {
    const message = scope
      ? "Esta regra aplica-se sempre neste produto: confirme marcando a opção."
      : "Esta regra aplica-se a todos os produtos: confirme marcando a opção.";
    return { ok: false, fieldErrors: { conditions: message } };
  }
  const type = String(formData.get("effectType") ?? "");
  const option = String(formData.get("effectOption") ?? "");
  const effect =
    type === "forbid"
      ? { type }
      : type === "restrict"
        ? { type, option, values: formData.getAll("effectValues").map(String) }
        : { type, option };
  const parsed = ruleInputSchema.safeParse({
    conditions,
    effect,
    message: formData.get("message") ?? "",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] === "effect" ? "effect" : String(issue.path[0]);
      fieldErrors[field] ??=
        field === "effect" && issue.path[1] === "values"
          ? "Escolha os valores que ficam"
          : issue.message;
    }
    return { ok: false, fieldErrors };
  }
  const result = await saveRule(scope?.versionId ?? null, ruleId, parsed.data);
  if (!result.ok) return { ok: false, message: result.message };
  log.info("rule.saved", {
    ruleId: result.id,
    versionId: scope?.versionId ?? null,
    userId: session.user.id,
  });
  translateInBackground();
  revalidatePath(pathOf(scope));
  return { ok: true, message: ruleId ? "Guardada" : "Criada" };
}

export type RemoveRuleResult = { ok: boolean; message: string };

/**
 * Apaga uma regra e deixa o resultado num flash (toast na página seguinte).
 * Devolve também {ok, message} para quem a chame de um componente cliente.
 * O tipo é `void & RemoveRuleResult` para continuar a servir diretamente como
 * `<form action={removeRuleAction.bind(…)}>` (o React espera Promise<void>).
 */
export async function removeRuleAction(
  scope: RuleScope,
  ruleId: string,
): Promise<void & RemoveRuleResult> {
  const session = await requireAdmin(pathOf(scope));
  if (!uuid.safeParse(ruleId).success)
    return { ok: false, message: "Pedido inválido" } as void & RemoveRuleResult;
  const result = await removeRule(ruleId);
  if (result.ok) log.info("rule.removed", { ruleId, userId: session.user.id });
  const outcome: RemoveRuleResult = result.ok
    ? { ok: true, message: "Regra apagada." }
    : { ok: false, message: result.message };
  await setFlash(outcome.ok ? "ok" : "danger", outcome.message);
  revalidatePath(pathOf(scope));
  return outcome as void & RemoveRuleResult;
}
