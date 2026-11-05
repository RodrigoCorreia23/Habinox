"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { log } from "@/lib/log";
import { parseParams } from "@/lib/options";
import { setFlash } from "@/server/admin/flash";
import { requireAdmin } from "@/server/auth/session";
import { addOptionToVersion, getProduct } from "@/server/catalog/products";
import { translateInBackground } from "@/server/catalog/translations";
import {
  createOption,
  createValue,
  importValuesFromErp,
  moveValue,
  optionInputSchema,
  type ProductRef,
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
  /** O id criado (valor novo), para a página o abrir logo. */
  id?: string;
} | null;

export type ActionResult = { ok: boolean; message: string };

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
  translateInBackground();
  revalidatePath(PATH);

  // Criada a partir do editor de um produto: medidas e números entram já no produto;
  // uma escolha precisa primeiro dos valores (a página da opção mostra «Acrescentar a…»).
  const productId = z.uuid().safeParse(formData.get("productId"));
  if (productId.success) {
    const product = await getProduct(productId.data);
    if (product?.working) {
      if (parsed.data.type !== "choice") {
        const added = await addOptionToVersion(product.working.id, result.id);
        if (added.ok) {
          revalidatePath(`/admin/produtos/${productId.data}`);
          await setFlash("ok", `Opção criada e acrescentada a ${product.product.name.pt}.`);
          redirect(`/admin/produtos/${productId.data}#opcoes`);
        }
      }
      await setFlash("ok", "Opção criada. Acrescente os valores e depois junte-a ao produto.");
      redirect(`${PATH}/${result.id}?produto=${productId.data}`);
    }
  }

  await setFlash(
    "ok",
    parsed.data.type === "choice" ? "Opção criada. Falta acrescentar os valores." : "Opção criada.",
  );
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
  translateInBackground();
  revalidatePath(PATH);
  revalidatePath(`${PATH}/${id}`);
  return { ok: true, message: "Guardado" };
}

/** «Portão de correr e Guarda continuam…»: o efeito dito com os nomes dos produtos. */
function stillUsedBy(products: ProductRef[], what: string) {
  const names = products.slice(0, 3).map((product) => product.name);
  const rest = products.length - names.length;
  const list =
    rest > 0
      ? `${names.join(", ")} e mais ${rest}`
      : names.length > 1
        ? `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`
        : names[0];
  return `${list} ${products.length === 1 ? "continua" : "continuam"} a ${what}; na loja não muda nada.`;
}

/**
 * Arquivar ou repor uma opção. Os produtos que já a usam ficam iguais; a mensagem
 * (toast na página seguinte, por setFlash) diz quais são.
 */
export async function archiveOptionAction(id: string, archived: boolean): Promise<ActionResult> {
  const session = await requireAdmin(PATH);
  if (!uuid.safeParse(id).success) return { ok: false, message: "Pedido inválido" };
  const result = await setOptionArchived(id, archived);
  if (!result.ok) {
    await setFlash("danger", "Opção não encontrada.");
    return { ok: false, message: "Opção não encontrada." };
  }
  log.info(archived ? "option.archived" : "option.restored", {
    optionId: id,
    usedIn: result.usedIn.length,
    userId: session.user.id,
  });
  translateInBackground();
  revalidatePath(PATH);
  revalidatePath(`${PATH}/${id}`);
  const message = !archived
    ? "Opção reposta. Já se pode acrescentar a produtos."
    : result.usedIn.length > 0
      ? `Opção arquivada. ${stillUsedBy(result.usedIn, "usá-la")}`
      : "Opção arquivada.";
  await setFlash("ok", message);
  return { ok: true, message };
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
  translateInBackground();
  revalidatePath(`${PATH}/${optionId}`);
  return { ok: true, message: valueId ? "Guardado" : "Criado", id: result.id };
}

/** Arquivar ou repor um valor; como nas opções, os produtos que o oferecem ficam iguais. */
export async function archiveValueAction(id: string, archived: boolean): Promise<ActionResult> {
  const session = await requireAdmin(PATH);
  if (!uuid.safeParse(id).success) return { ok: false, message: "Pedido inválido" };
  const { optionId, usedIn } = await setValueArchived(id, archived);
  if (!optionId) {
    await setFlash("danger", "Valor não encontrado.");
    return { ok: false, message: "Valor não encontrado." };
  }
  log.info(archived ? "option_value.archived" : "option_value.restored", {
    valueId: id,
    usedIn: usedIn.length,
    userId: session.user.id,
  });
  translateInBackground();
  revalidatePath(PATH);
  revalidatePath(`${PATH}/${optionId}`);
  const message = !archived
    ? "Valor reposto."
    : usedIn.length > 0
      ? `Valor arquivado. ${stillUsedBy(usedIn, "oferecê-lo")}`
      : "Valor arquivado.";
  await setFlash("ok", message);
  return { ok: true, message };
}

/** ↑↓ nos valores de uma opção. */
export async function moveValueAction(id: string, direction: "up" | "down"): Promise<void> {
  const session = await requireAdmin(PATH);
  if (!uuid.safeParse(id).success) return;
  const result = await moveValue(id, direction);
  if (!result.ok || !result.optionId) {
    await setFlash("danger", "Não foi possível mudar a ordem.");
    revalidatePath(PATH);
    return;
  }
  log.info("option_value.moved", { valueId: id, direction, userId: session.user.id });
  revalidatePath(`${PATH}/${result.optionId}`);
}

/** «Importar do Odoo»: cria valores a partir dos artigos escolhidos. */
export async function importFromErpAction(
  optionId: string,
  materialIds: string[],
  link: boolean,
): Promise<{ ok: boolean; message: string }> {
  const session = await requireAdmin(`/admin/opcoes/${optionId}`);
  const ids = z.array(z.uuid()).max(500).safeParse(materialIds);
  if (!z.uuid().safeParse(optionId).success || !ids.success) {
    return { ok: false, message: "Pedido inválido" };
  }
  if (ids.data.length === 0) return { ok: false, message: "Escolha pelo menos um artigo" };
  const result = await importValuesFromErp(optionId, ids.data, link);
  if ("error" in result) return { ok: false, message: result.error };
  log.info("option.values_imported", {
    optionId,
    created: result.created.length,
    skipped: result.skipped.length,
    link,
    userId: session.user.id,
  });
  if (result.created.length > 0) translateInBackground();
  revalidatePath(`/admin/opcoes/${optionId}`);
  const created = result.created.length;
  const skipped = result.skipped.length;
  return {
    ok: created > 0,
    message:
      created === 0
        ? "Nada importado: esses artigos já existem nesta opção."
        : `${created === 1 ? "1 valor importado" : `${created} valores importados`}${skipped ? `; ${skipped} já existia${skipped === 1 ? "" : "m"}` : ""}.`,
  };
}

/** Junta a opção (com todos os valores) ao produto de onde se veio e volta ao editor. */
export async function addToProductAction(optionId: string, productId: string) {
  const session = await requireAdmin(`/admin/opcoes/${optionId}`);
  if (!z.uuid().safeParse(optionId).success || !z.uuid().safeParse(productId).success) return;
  const product = await getProduct(productId);
  if (!product?.working) {
    await setFlash("danger", "O produto já não tem uma versão em preparação.");
    redirect(`/admin/produtos/${productId}`);
  }
  const added = await addOptionToVersion(product.working.id, optionId);
  log.info("product.option_added", { productId, optionId, ok: added.ok, userId: session.user.id });
  revalidatePath(`/admin/produtos/${productId}`);
  await setFlash(
    added.ok ? "ok" : "danger",
    added.ok ? `Opção acrescentada a ${product.product.name.pt}.` : added.message,
  );
  redirect(`/admin/produtos/${productId}#opcoes`);
}
