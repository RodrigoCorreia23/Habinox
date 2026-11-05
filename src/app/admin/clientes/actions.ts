"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/session";
import { eraseCustomer } from "@/server/privacy";

export type EraseState = { ok: boolean; message: string } | null;

export async function eraseCustomerAction(
  id: string,
  expectedEmail: string,
  _previous: EraseState,
  formData: FormData,
): Promise<EraseState> {
  const session = await requireAdmin(`/admin/clientes/${id}`);
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "Conta não encontrada" };
  // Confirmação escrita: apagar não se desfaz.
  const typed = String(formData.get("confirm") ?? "")
    .trim()
    .toLowerCase();
  if (typed !== expectedEmail.toLowerCase()) {
    return { ok: false, message: "Escreva o email da conta, exatamente, para confirmar" };
  }
  const result = await eraseCustomer(id, session.user.id);
  if (!result.ok) return result;
  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${id}`);
  return { ok: true, message: "Conta apagada." };
}
