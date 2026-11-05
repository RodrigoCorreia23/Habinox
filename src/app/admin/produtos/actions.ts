"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { log } from "@/lib/log";
import { setFlash } from "@/server/admin/flash";
import { requireAdmin } from "@/server/auth/session";
import { translateInBackground } from "@/server/catalog/translations";
import {
  addOptionToVersion,
  createDraftFrom,
  createProduct,
  getProduct,
  moveVersionOption,
  productInputSchema,
  productOptionInputSchema,
  removeVersionOption,
  updateProduct,
  updateVersionOption,
} from "@/server/catalog/products";
import { publishVersion, validateVersion } from "@/server/catalog/rules";

export type FormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
} | null;

const PATH = "/admin/produtos";
const uuid = z.uuid();

/** Traduz para português os erros genéricos de números (as mensagens próprias ficam). */
function issueMessage(issue: z.core.$ZodIssue): string {
  if (issue.code === "invalid_type" && (issue.expected === "number" || issue.expected === "int"))
    return "Escreva um número inteiro, sem vírgulas.";
  if (issue.code === "too_small" && issue.origin === "number")
    return Number(issue.minimum) === 0 && !issue.inclusive
      ? "Tem de ser maior que zero."
      : `Não pode ser menor que ${String(issue.minimum)}.`;
  return issue.message;
}

function fromZod(error: z.ZodError): FormState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[String(issue.path[0])] ??= issueMessage(issue);
  return { ok: false, fieldErrors };
}

function fromResult(result: { ok: false; field?: string; message: string }): FormState {
  return result.field
    ? { ok: false, fieldErrors: { [result.field]: result.message } }
    : { ok: false, message: result.message };
}

function productFields(formData: FormData) {
  return {
    name: formData.get("name"),
    slug: formData.get("slug"),
    categoryId: formData.get("categoryId"),
    description: formData.get("description") ?? "",
  };
}

export async function createProductAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAdmin(PATH);
  const parsed = productInputSchema.safeParse(productFields(formData));
  if (!parsed.success) return fromZod(parsed.error);
  const result = await createProduct(parsed.data, session.user.id);
  if (!result.ok) return fromResult(result);
  log.info("product.created", { productId: result.id, userId: session.user.id });
  translateInBackground();
  revalidatePath(PATH);
  redirect(`${PATH}/${result.id}`);
}

export async function updateProductAction(
  id: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAdmin(PATH);
  if (!uuid.safeParse(id).success) return { ok: false, message: "Pedido inválido" };
  const parsed = productInputSchema.safeParse(productFields(formData));
  if (!parsed.success) return fromZod(parsed.error);
  const result = await updateProduct(id, parsed.data);
  if (!result.ok) return fromResult(result);
  log.info("product.updated", { productId: id, userId: session.user.id });
  translateInBackground();
  revalidatePath(PATH);
  revalidatePath(`${PATH}/${id}`);
  return { ok: true, message: "Guardado" };
}

export async function createDraftAction(productId: string, fromVersionId: string) {
  const session = await requireAdmin(PATH);
  if (!uuid.safeParse(productId).success || !uuid.safeParse(fromVersionId).success) return;
  const draftId = await createDraftFrom(fromVersionId, session.user.id);
  log.info("product.draft_created", { productId, draftId, fromVersionId, userId: session.user.id });
  await setFlash("ok", "Cópia pronta a editar. A loja continua igual até publicar.");
  revalidatePath(`${PATH}/${productId}`);
}

export async function addOptionAction(
  productId: string,
  versionId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAdmin(PATH);
  const optionId = uuid.safeParse(formData.get("optionId"));
  if (!uuid.safeParse(versionId).success || !optionId.success) {
    return { ok: false, message: "Escolha uma opção" };
  }
  const result = await addOptionToVersion(versionId, optionId.data);
  if (!result.ok) return { ok: false, message: result.message };
  log.info("product.option_added", {
    productId,
    versionId,
    optionId: optionId.data,
    userId: session.user.id,
  });
  revalidatePath(`${PATH}/${productId}`);
  return { ok: true, message: "Acrescentada" };
}

export async function updateProductOptionAction(
  productId: string,
  productOptionId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAdmin(PATH);
  if (!uuid.safeParse(productOptionId).success) return { ok: false, message: "Pedido inválido" };
  const parsed = productOptionInputSchema.safeParse({
    var: formData.get("var") ?? "",
    required: formData.get("required") === "on",
    min: formData.get("min") || null,
    max: formData.get("max") || null,
    step: formData.get("step") || null,
    allowed: formData.getAll("allowed"),
    defaultValueId: formData.get("defaultValueId") || null,
  });
  if (!parsed.success) return fromZod(parsed.error);
  const result = await updateVersionOption(productOptionId, parsed.data);
  if (!result.ok) return fromResult(result);
  log.info("product.option_updated", { productId, productOptionId, userId: session.user.id });
  revalidatePath(`${PATH}/${productId}`);
  return { ok: true, message: "Guardado" };
}

export async function moveOptionAction(
  productId: string,
  productOptionId: string,
  direction: -1 | 1,
) {
  await requireAdmin(PATH);
  if (!uuid.safeParse(productOptionId).success) return;
  await moveVersionOption(productOptionId, direction);
  revalidatePath(`${PATH}/${productId}`);
}

export async function removeOptionAction(productId: string, productOptionId: string) {
  const session = await requireAdmin(PATH);
  if (!uuid.safeParse(productOptionId).success) return;
  const result = await removeVersionOption(productOptionId);
  if (result.ok) {
    log.info("product.option_removed", { productId, productOptionId, userId: session.user.id });
  }
  await setFlash(
    result.ok ? "ok" : "danger",
    result.ok ? "Opção removida do produto." : result.message,
  );
  revalidatePath(`${PATH}/${productId}`);
}

export type PublishState = { ok: boolean; message: string; problems?: string[] } | null;

export async function validateVersionAction(
  productId: string,
  versionId: string,
): Promise<PublishState> {
  const session = await requireAdmin(PATH);
  if (!uuid.safeParse(versionId).success) return { ok: false, message: "Pedido inválido" };
  const { ok, problems } = await validateVersion(versionId);
  if (!ok) {
    return { ok: false, message: "Há problemas por resolver", problems: problems.blocking };
  }
  log.info("product.version_validated", { productId, versionId, userId: session.user.id });
  revalidatePath(`${PATH}/${productId}`);
  return { ok: true, message: "Validada. Já pode publicar." };
}

export async function publishVersionAction(
  productId: string,
  versionId: string,
): Promise<PublishState> {
  const session = await requireAdmin(PATH);
  if (!uuid.safeParse(versionId).success) return { ok: false, message: "Pedido inválido" };
  const result = await publishVersion(versionId);
  if (!result.ok) return { ok: false, message: result.message };
  log.info("product.version_published", { productId, versionId, userId: session.user.id });
  revalidatePath(PATH);
  revalidatePath(`${PATH}/${productId}`);
  return { ok: true, message: "Publicada" };
}

/**
 * «Publicar na loja» num só passo: confirma a versão (validateVersion) e publica-a
 * (publishVersion), sem mudar nenhuma das duas. O resultado chega como toast.
 */
export async function confirmAndPublishAction(productId: string, versionId: string): Promise<void> {
  const session = await requireAdmin(PATH);
  if (!uuid.safeParse(productId).success || !uuid.safeParse(versionId).success) {
    await setFlash("danger", "Pedido inválido.");
    return;
  }
  const { working } = (await getProduct(productId)) ?? { working: null };
  if (!working || working.id !== versionId) {
    await setFlash("danger", "Esta versão já não está em preparação. Atualize a página.");
    revalidatePath(`${PATH}/${productId}`);
    return;
  }
  if (working.status === "draft") {
    const { ok, problems } = await validateVersion(versionId);
    if (!ok) {
      await setFlash(
        "danger",
        problems.blocking.length > 0
          ? `Ainda não se pode publicar: ${problems.blocking[0]}`
          : "Não foi possível confirmar esta versão. Atualize a página e tente de novo.",
      );
      revalidatePath(`${PATH}/${productId}`);
      return;
    }
    log.info("product.version_validated", { productId, versionId, userId: session.user.id });
  }
  const result = await publishVersion(versionId);
  if (!result.ok) {
    await setFlash("danger", result.message);
    revalidatePath(`${PATH}/${productId}`);
    return;
  }
  log.info("product.version_published", { productId, versionId, userId: session.user.id });
  await setFlash("ok", "Publicado. Já está na loja.");
  revalidatePath(PATH);
  revalidatePath(`${PATH}/${productId}`);
}
