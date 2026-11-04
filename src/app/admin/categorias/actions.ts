"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { log } from "@/lib/log";
import { requireAdmin } from "@/server/auth/session";
import {
  archiveCategory,
  type CategoryInput,
  categoryInputSchema,
  restoreCategory,
  saveCategory,
} from "@/server/catalog/categories";

export type FormState = {
  message?: string;
  fieldErrors?: Partial<Record<keyof CategoryInput, string>>;
} | null;

export async function saveCategoryAction(
  id: string | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAdmin("/admin/categorias");
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
    return { fieldErrors };
  }

  const result = await saveCategory(id && z.uuid().safeParse(id).success ? id : null, parsed.data);
  if (!result.ok) {
    return result.field
      ? { fieldErrors: { [result.field]: result.message } }
      : { message: result.message };
  }
  log.info("category.saved", {
    categoryId: result.id,
    created: id === null,
    userId: session.user.id,
  });
  revalidatePath("/admin/categorias");
  redirect("/admin/categorias");
}

export type RowState = { ok: boolean; message: string } | null;

export async function archiveCategoryAction(id: string): Promise<RowState> {
  const session = await requireAdmin("/admin/categorias");
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "Pedido inválido" };
  const result = await archiveCategory(id);
  if (result.ok) {
    log.info("category.archived", { categoryId: id, userId: session.user.id });
    revalidatePath("/admin/categorias");
  }
  return result;
}

export async function restoreCategoryAction(id: string): Promise<RowState> {
  const session = await requireAdmin("/admin/categorias");
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "Pedido inválido" };
  const result = await restoreCategory(id);
  if (result.ok) {
    log.info("category.restored", { categoryId: id, userId: session.user.id });
    revalidatePath("/admin/categorias");
  }
  return result;
}
