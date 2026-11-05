"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { log } from "@/lib/log";
import { setFlash } from "@/server/admin/flash";
import { requireAdmin } from "@/server/auth/session";
import { translateInBackground } from "@/server/catalog/translations";
import {
  archiveCategory,
  type CategoryInput,
  categoryInputSchema,
  moveCategory,
  restoreCategory,
  saveCategory,
} from "@/server/catalog/categories";

export type FormState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Partial<Record<keyof CategoryInput, string>>;
} | null;

const PATH = "/admin/categorias";

export async function saveCategoryAction(
  id: string | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAdmin(PATH);
  const parsed = categoryInputSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") ?? "",
    parentId: formData.get("parentId") || null,
    position: formData.get("position") || 0,
  });
  if (!parsed.success) {
    const fieldErrors: NonNullable<FormState>["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof CategoryInput;
      fieldErrors[field] ??= issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const editing = id !== null && z.uuid().safeParse(id).success;
  const result = await saveCategory(editing ? id : null, parsed.data);
  if (!result.ok) {
    return result.field
      ? { ok: false, fieldErrors: { [result.field]: result.message } }
      : { ok: false, message: result.message };
  }
  log.info("category.saved", {
    categoryId: result.id,
    created: !editing,
    userId: session.user.id,
  });
  translateInBackground();
  revalidatePath(PATH);
  if (editing) {
    // Fica na página: o formulário mostra «Guardado» num toast.
    revalidatePath(`${PATH}/${result.id}`);
    return { ok: true, message: "Guardado." };
  }
  // Uma categoria nova ainda não tem imagem: abre-se a ficha com a imagem em destaque.
  await setFlash("ok", "Categoria criada. Falta a imagem.");
  redirect(`${PATH}/${result.id}`);
}

export type RowState = { ok: boolean; message: string } | null;

export async function archiveCategoryAction(id: string): Promise<RowState> {
  const session = await requireAdmin(PATH);
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "Pedido inválido" };
  const result = await archiveCategory(id);
  if (result.ok) {
    log.info("category.archived", { categoryId: id, userId: session.user.id });
    revalidatePath(PATH);
    revalidatePath(`${PATH}/${id}`);
  }
  return result;
}

export async function restoreCategoryAction(id: string): Promise<RowState> {
  const session = await requireAdmin(PATH);
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "Pedido inválido" };
  const result = await restoreCategory(id);
  if (result.ok) {
    log.info("category.restored", { categoryId: id, userId: session.user.id });
    translateInBackground();
    revalidatePath(PATH);
    revalidatePath(`${PATH}/${id}`);
  }
  return result;
}

/** ↑↓ na lista: muda a ordem entre as irmãs. */
export async function moveCategoryAction(id: string, direction: "up" | "down"): Promise<void> {
  const session = await requireAdmin(PATH);
  if (!z.uuid().safeParse(id).success) return;
  const result = await moveCategory(id, direction);
  if (result.ok) {
    log.info("category.moved", { categoryId: id, direction, userId: session.user.id });
  } else {
    await setFlash("danger", result.message);
  }
  revalidatePath(PATH);
}
