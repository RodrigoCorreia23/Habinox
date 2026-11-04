"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { log } from "@/lib/log";
import { parseParams } from "@/lib/options";
import { requireAdmin } from "@/server/auth/session";
import {
  createOption,
  createValue,
  optionInputSchema,
  setOptionArchived,
  setValueArchived,
  updateOption,
  updateValue,
  valueInputSchema,
} from "@/server/catalog/options";

export type FormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
} | null;

const PATH = "/admin/opcoes";
const uuid = z.uuid();

function fieldErrors(error: z.ZodError): FormState {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) errors[String(issue.path[0])] ??= issue.message;
  return { ok: false, fieldErrors: errors };
}

function optionFields(formData: FormData) {
  return {
    name: formData.get("name"),
    key: formData.get("key") ?? "",
    type: formData.get("type"),
    unit: formData.get("unit") || null,
    display: formData.get("display") || null,
    helpText: formData.get("helpText") ?? "",
  };
}

export async function createOptionAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAdmin(PATH);
  const parsed = optionInputSchema.safeParse(optionFields(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const result = await createOption(parsed.data);
  if (!result.ok) {
    return {
      ok: false,
      ...(result.field
        ? { fieldErrors: { [result.field]: result.message } }
        : { message: result.message }),
    };
  }
  log.info("option.created", {
    optionId: result.id,
    key: parsed.data.key,
    userId: session.user.id,
  });
  revalidatePath(PATH);
  redirect(`${PATH}/${result.id}`);
}

export async function updateOptionAction(
  id: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAdmin(PATH);
  if (!uuid.safeParse(id).success) return { ok: false, message: "Pedido inválido" };
  // Chave e tipo não mudam: valida com os valores atuais vindos do formulário (só leitura).
  const parsed = optionInputSchema.safeParse(optionFields(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const result = await updateOption(id, parsed.data);
  if (!result.ok) return { ok: false, message: result.message };
  log.info("option.updated", { optionId: id, userId: session.user.id });
  revalidatePath(PATH);
  revalidatePath(`${PATH}/${id}`);
  return { ok: true, message: "Guardado" };
}

export async function archiveOptionAction(id: string, archived: boolean) {
  const session = await requireAdmin(PATH);
  if (!uuid.safeParse(id).success) return;
  await setOptionArchived(id, archived);
  log.info(archived ? "option.archived" : "option.restored", {
    optionId: id,
    userId: session.user.id,
  });
  revalidatePath(PATH);
  revalidatePath(`${PATH}/${id}`);
}

export async function saveValueAction(
  optionId: string,
  valueId: string | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAdmin(PATH);
  if (!uuid.safeParse(optionId).success || (valueId && !uuid.safeParse(valueId).success)) {
    return { ok: false, message: "Pedido inválido" };
  }
  const params = parseParams(String(formData.get("params") ?? ""));
  if (!params.ok) return { ok: false, fieldErrors: { params: params.message } };

  const parsed = valueInputSchema.safeParse({
    label: formData.get("label"),
    key: formData.get("key") ?? "",
    position: formData.get("position") || 0,
    params: params.params,
    ralCode: formData.get("ralCode") ?? "",
    swatchHex: formData.get("swatchHex") ?? "",
    materialId: formData.get("materialId") || null,
    asksText: formData.get("asksText") === "on",
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const result = valueId
    ? await updateValue(valueId, parsed.data)
    : await createValue(optionId, parsed.data);
  if (!result.ok) {
    return {
      ok: false,
      ...(result.field
        ? { fieldErrors: { [result.field]: result.message } }
        : { message: result.message }),
    };
  }
  log.info(valueId ? "option_value.updated" : "option_value.created", {
    optionId,
    valueId: result.id,
    userId: session.user.id,
  });
  revalidatePath(`${PATH}/${optionId}`);
  return { ok: true, message: valueId ? "Guardado" : "Criado" };
}

export async function archiveValueAction(id: string, archived: boolean) {
  const session = await requireAdmin(PATH);
  if (!uuid.safeParse(id).success) return;
  const optionId = await setValueArchived(id, archived);
  if (optionId) {
    log.info(archived ? "option_value.archived" : "option_value.restored", {
      valueId: id,
      userId: session.user.id,
    });
    revalidatePath(`${PATH}/${optionId}`);
  }
}
