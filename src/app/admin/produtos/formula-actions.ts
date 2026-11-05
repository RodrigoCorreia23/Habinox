"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { log } from "@/lib/log";
import { percentToFraction } from "@/lib/percent";
import { setFlash } from "@/server/admin/flash";
import { requireAdmin } from "@/server/auth/session";
import { getVatRate } from "@/server/settings";
import { translateInBackground } from "@/server/catalog/translations";
import {
  lineInputSchema,
  loadPricingModel,
  moveFormulaItem,
  removeFormulaItem,
  saveLine,
  saveVariable,
  setConsumablesRate,
  variableInputSchema,
} from "@/server/catalog/formula";
import type { FormState } from "./actions";
import { computePreview, type PreviewResult } from "./preview";

const uuid = z.uuid();
const path = (productId: string) => `/admin/produtos/${productId}`;

function fromZod(error: z.ZodError): FormState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
  return { ok: false, fieldErrors };
}

function fromResult(result: { ok: false; field?: string; message: string }): FormState {
  return result.field
    ? { ok: false, fieldErrors: { [result.field]: result.message } }
    : { ok: false, message: result.message };
}

export async function consumablesAction(
  productId: string,
  versionId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin(path(productId));
  if (!uuid.safeParse(versionId).success) return { ok: false, message: "Pedido inválido" };
  const parsed = percentToFraction(String(formData.get("rate") ?? "0") || "0");
  if (!parsed.ok) return { ok: false, fieldErrors: { rate: parsed.message } };
  const result = await setConsumablesRate(versionId, parsed.fraction);
  if (!result.ok) return fromResult(result);
  revalidatePath(path(productId));
  return { ok: true, message: "Guardado" };
}

export async function saveVariableAction(
  productId: string,
  versionId: string,
  variableId: string | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAdmin(path(productId));
  if (!uuid.safeParse(versionId).success) return { ok: false, message: "Pedido inválido" };
  const parsed = variableInputSchema.safeParse({
    name: formData.get("name"),
    expr: formData.get("expr"),
    label: formData.get("label") ?? "",
    showToCustomer: formData.get("showToCustomer") === "on",
  });
  if (!parsed.success) return fromZod(parsed.error);
  const result = await saveVariable(versionId, variableId, parsed.data);
  if (!result.ok) return fromResult(result);
  log.info("formula.variable_saved", {
    productId,
    versionId,
    variableId: result.id,
    userId: session.user.id,
  });
  translateInBackground();
  revalidatePath(path(productId));
  return { ok: true, message: variableId ? "Guardado" : "Criada" };
}

export async function saveLineAction(
  productId: string,
  versionId: string,
  lineId: string | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAdmin(path(productId));
  if (!uuid.safeParse(versionId).success) return { ok: false, message: "Pedido inválido" };
  let conditions: unknown;
  let mapping: unknown;
  try {
    conditions = JSON.parse(String(formData.get("conditions") || "[]"));
    mapping = JSON.parse(String(formData.get("mapping") || "[]"));
  } catch {
    return { ok: false, message: "Pedido inválido" };
  }
  const parsed = lineInputSchema.safeParse({
    label: formData.get("label"),
    kind: formData.get("kind"),
    quantityExpr: formData.get("quantityExpr"),
    unit: formData.get("unit"),
    conditions,
    source: formData.get("source") || "fixed",
    sectorId: formData.get("sectorId") || null,
    materialId: formData.get("materialId") || null,
    articleOptionId: formData.get("articleOptionId") || null,
    mapping,
  });
  if (!parsed.success) return fromZod(parsed.error);
  const result = await saveLine(versionId, lineId, parsed.data);
  if (!result.ok) return fromResult(result);
  log.info("formula.line_saved", {
    productId,
    versionId,
    lineId: result.id,
    userId: session.user.id,
  });
  revalidatePath(path(productId));
  return { ok: true, message: lineId ? "Guardado" : "Criada" };
}

export async function removeFormulaItemAction(
  productId: string,
  kind: "variable" | "line",
  id: string,
) {
  const session = await requireAdmin(path(productId));
  if (!uuid.safeParse(id).success) return;
  const result = await removeFormulaItem(kind, id);
  if (result.ok) log.info("formula.item_removed", { productId, kind, id, userId: session.user.id });
  await setFlash(
    result.ok ? "ok" : "danger",
    result.ok
      ? kind === "line"
        ? "Linha apagada. O preço deixou de contar este custo."
        : "Conta auxiliar apagada."
      : result.message,
  );
  revalidatePath(path(productId));
}

export async function moveFormulaItemAction(
  productId: string,
  kind: "variable" | "line",
  id: string,
  direction: -1 | 1,
) {
  await requireAdmin(path(productId));
  if (!uuid.safeParse(id).success) return;
  await moveFormulaItem(kind, id, direction);
  revalidatePath(path(productId));
}

export type { PreviewResult };

/**
 * Preço de exemplo com valores escolhidos no backoffice. Não grava nada.
 * Devolve também o IVA (dos parâmetros), o total com IVA, o custo e a margem.
 */
export async function previewAction(
  versionId: string,
  _previous: PreviewResult,
  formData: FormData,
): Promise<PreviewResult> {
  await requireAdmin("/admin/produtos");
  if (!uuid.safeParse(versionId).success) {
    return { ok: false, errors: [{ message: "Pedido inválido", sourceIndex: null }] };
  }
  const [model, vatRate] = await Promise.all([loadPricingModel(versionId), getVatRate()]);
  if (!model) {
    return { ok: false, errors: [{ message: "Versão não encontrada", sourceIndex: null }] };
  }
  // Os campos chegam como texto; computePreview converte conforme o tipo de cada opção.
  const raw: Record<string, unknown> = {};
  for (const option of model.input.options) raw[option.key] = formData.get(option.key);
  return computePreview(model, raw, vatRate);
}
