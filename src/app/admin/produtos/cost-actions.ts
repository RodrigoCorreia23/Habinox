"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { log } from "@/lib/log";
import { parseCostInput, parseEuroInput } from "@/lib/money";
import { percentToFraction } from "@/lib/percent";
import { requireAdmin } from "@/server/auth/session";
import { patchCostOverride } from "@/server/catalog/cost-overrides";

const uuid = z.uuid();

/**
 * Custo ou margem próprios de um material/sector neste produto (versão em
 * preparação). Vazio = volta ao valor geral.
 */
export async function setCostOverrideAction(
  productId: string,
  versionId: string,
  kind: "material" | "sector",
  id: string,
  field: "cost" | "margin",
  raw: string,
): Promise<{ ok: boolean; message?: string }> {
  const session = await requireAdmin(`/admin/produtos/${productId}`);
  if (![productId, versionId, id].every((value) => uuid.safeParse(value).success)) {
    return { ok: false, message: "Pedido inválido" };
  }
  if (kind !== "material" && kind !== "sector") return { ok: false, message: "Pedido inválido" };
  if (field !== "cost" && field !== "margin") return { ok: false, message: "Pedido inválido" };

  const text = raw.trim();
  let value: string | null = null;
  if (text !== "") {
    if (field === "margin") {
      const parsed = percentToFraction(text);
      if (!parsed.ok) return { ok: false, message: parsed.message };
      value = parsed.fraction;
    } else if (kind === "material") {
      const parsed = parseCostInput(text);
      if (!parsed.ok) return { ok: false, message: parsed.message };
      value = parsed.value;
    } else {
      const parsed = parseEuroInput(text);
      if (!parsed.ok) return { ok: false, message: parsed.message };
      value = String(parsed.cents);
    }
  }

  const result = await patchCostOverride(versionId, kind, id, field, value);
  if (!result.ok) return { ok: false, message: result.message };
  log.info("product.cost_override", {
    productId,
    versionId,
    kind,
    id,
    field,
    value,
    userId: session.user.id,
  });
  revalidatePath(`/admin/produtos/${productId}`);
  return { ok: true, message: value === null ? "Volta ao geral" : "Guardado" };
}
