"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isOrderStatus } from "@/lib/orders/state";
import { requireAdmin } from "@/server/auth/session";
import { changeOrderStatus } from "@/server/orders/admin";

export type StatusState = { ok: boolean; message: string } | null;

export async function changeStatusAction(
  orderId: string,
  _previous: StatusState,
  formData: FormData,
): Promise<StatusState> {
  const session = await requireAdmin("/admin/encomendas");
  const to = String(formData.get("to") ?? "");
  const note = String(formData.get("note") ?? "").slice(0, 1000);
  if (!z.uuid().safeParse(orderId).success || !isOrderStatus(to)) {
    return { ok: false, message: "Pedido inválido" };
  }
  const result = await changeOrderStatus({ orderId, to, actorUserId: session.user.id, note });
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/admin/encomendas");
  revalidatePath(`/admin/encomendas/${orderId}`);
  return { ok: true, message: "Estado alterado. O cliente foi avisado por email." };
}
