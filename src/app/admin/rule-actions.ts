"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { log } from "@/lib/log";
import { requireAdmin } from "@/server/auth/session";
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
  revalidatePath(pathOf(scope));
  return { ok: true, message: ruleId ? "Guardada" : "Criada" };
}

export async function removeRuleAction(scope: RuleScope, ruleId: string) {
  const session = await requireAdmin(pathOf(scope));
  if (!uuid.safeParse(ruleId).success) return;
  const result = await removeRule(ruleId);
  if (result.ok) log.info("rule.removed", { ruleId, userId: session.user.id });
  revalidatePath(pathOf(scope));
}
