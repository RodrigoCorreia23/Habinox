"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { log } from "@/lib/log";
import { percentToFraction } from "@/lib/percent";
import { requireAdmin } from "@/server/auth/session";
import {
  countMaterialUsage,
  lastSuccessfulSync,
  setMaterialMargin,
} from "@/server/catalog/materials";
import { getErpClient, syncErpMaterials } from "@/server/sync/odoo";
import { describeSyncFailure, describeSyncSummary } from "./sync-messages";

export type ActionState = {
  ok: boolean;
  message: string;
  /** Texto técnico para o suporte (nunca a frase principal). */
  detail?: string;
  /** Depois de sincronizar: filtro da lista onde estão os artigos que pedem ação. */
  reviewFilter?: "sem-margem" | "desaparecidos";
} | null;

const marginForm = z.object({ id: z.uuid(), margin: z.string().max(20) });

const products = (n: number) => (n === 1 ? "1 produto" : `${n} produtos`);

export async function updateMarginAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin("/admin/materiais");
  const parsed = marginForm.safeParse({ id: formData.get("id"), margin: formData.get("margin") });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Não foi possível guardar. Recarregue a página e tente outra vez.",
    };
  }

  // Vazio = volta a "por decidir".
  let fraction: string | null = null;
  if (parsed.data.margin.trim() !== "") {
    const result = percentToFraction(parsed.data.margin);
    if (!result.ok) return { ok: false, message: `${result.message}.` };
    fraction = result.fraction;
  }

  if (!(await setMaterialMargin(parsed.data.id, fraction))) {
    return { ok: false, message: "Este artigo já não existe. Recarregue a página." };
  }
  log.info("material.margin_updated", {
    materialId: parsed.data.id,
    margin: fraction,
    userId: session.user.id,
  });
  revalidatePath("/admin/materiais");

  // O preço calcula-se sempre com a margem atual: diz-se quantos produtos mudam.
  const used = await countMaterialUsage(parsed.data.id);
  if (used === 0) return { ok: true, message: "Guardado." };
  if (fraction === null) {
    return {
      ok: true,
      message: `Guardado. ${products(used)} ${used === 1 ? "fica" : "ficam"} sem se poder publicar até haver margem.`,
    };
  }
  return { ok: true, message: `Guardado. O preço de ${products(used)} foi recalculado.` };
}

export async function syncNowAction(): Promise<ActionState> {
  const session = await requireAdmin("/admin/materiais");
  const syncLog = log.child({ trigger: "manual", userId: session.user.id });

  let summary;
  try {
    summary = await syncErpMaterials(db, getErpClient(), syncLog);
  } catch (error) {
    syncLog.error("erp_sync.manual_failed", { error });
    const detail = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      message: describeSyncFailure([{ message: detail }], await lastSuccessfulSync()),
      detail,
    };
  }
  revalidatePath("/admin/materiais");

  switch (summary.status) {
    case "failed":
      return {
        ok: false,
        message: "O ERP não respondeu. Os custos ficaram como estavam. Tente daqui a uns minutos.",
      };
    case "skipped":
      return {
        ok: false,
        message: "Já estava uma sincronização a correr. Espere um minuto e veja o resultado.",
      };
    default:
      return {
        ok: true,
        message: describeSyncSummary(summary),
        reviewFilter:
          summary.inserted > 0 ? "sem-margem" : summary.missing > 0 ? "desaparecidos" : undefined,
      };
  }
}
