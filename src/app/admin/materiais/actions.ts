"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { log } from "@/lib/log";
import { percentToFraction } from "@/lib/percent";
import { requireAdmin } from "@/server/auth/session";
import { setMaterialMargin } from "@/server/catalog/materials";
import { getErpClient, syncErpMaterials } from "@/server/sync/odoo";

export type ActionState = { ok: boolean; message: string } | null;

const marginForm = z.object({ id: z.uuid(), margin: z.string().max(20) });

export async function updateMarginAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin("/admin/materiais");
  const parsed = marginForm.safeParse({ id: formData.get("id"), margin: formData.get("margin") });
  if (!parsed.success) return { ok: false, message: "Pedido inválido" };

  // Vazio = volta a "por decidir".
  let fraction: string | null = null;
  if (parsed.data.margin.trim() !== "") {
    const result = percentToFraction(parsed.data.margin);
    if (!result.ok) return { ok: false, message: result.message };
    fraction = result.fraction;
  }

  if (!(await setMaterialMargin(parsed.data.id, fraction))) {
    return { ok: false, message: "Material não encontrado" };
  }
  log.info("material.margin_updated", {
    materialId: parsed.data.id,
    margin: fraction,
    userId: session.user.id,
  });
  revalidatePath("/admin/materiais");
  return { ok: true, message: "Guardado" };
}

export async function syncNowAction(): Promise<ActionState> {
  const session = await requireAdmin("/admin/materiais");
  const syncLog = log.child({ trigger: "manual", userId: session.user.id });

  let summary;
  try {
    summary = await syncErpMaterials(db, getErpClient(), syncLog);
  } catch (error) {
    syncLog.error("erp_sync.manual_failed", { error });
    return { ok: false, message: error instanceof Error ? error.message : "Erro inesperado" };
  }
  revalidatePath("/admin/materiais");

  switch (summary.status) {
    case "failed":
      return { ok: false, message: "O ERP não respondeu. Os custos ficaram como estavam." };
    case "skipped":
      return { ok: false, message: "Já está uma sincronização a correr." };
    default: {
      const parts = [
        `${summary.inserted} novos`,
        `${summary.costChanges} custos alterados`,
        `${summary.missing} desaparecidos`,
      ];
      if (summary.errors > 0) parts.push(`${summary.errors} com erros`);
      return { ok: summary.status === "succeeded", message: `Sincronizado: ${parts.join(", ")}.` };
    }
  }
}
