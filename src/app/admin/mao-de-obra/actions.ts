"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { log } from "@/lib/log";
import { parseEuroInput } from "@/lib/money";
import { percentToFraction } from "@/lib/percent";
import { requireAdmin } from "@/server/auth/session";
import {
  createSector,
  type SectorInput,
  setSectorArchived,
  updateSector,
} from "@/server/catalog/sectors";

export type SectorFormState = {
  ok: boolean;
  message: string;
  field?: "name" | "rate" | "margin";
} | null;

const PATH = "/admin/mao-de-obra";

function parseForm(formData: FormData): SectorInput | NonNullable<SectorFormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 80) {
    return { ok: false, field: "name", message: "Escreva o nome (até 80 caracteres)" };
  }
  const rate = parseEuroInput(String(formData.get("rate") ?? ""));
  if (!rate.ok) return { ok: false, field: "rate", message: rate.message };

  const marginText = String(formData.get("margin") ?? "").trim();
  let margin: string | null = null;
  if (marginText !== "") {
    const parsed = percentToFraction(marginText);
    if (!parsed.ok) return { ok: false, field: "margin", message: parsed.message };
    margin = parsed.fraction;
  }
  return { name, hourlyRateCents: rate.cents, margin };
}

export async function saveSectorAction(
  id: string | null,
  _previous: SectorFormState,
  formData: FormData,
): Promise<SectorFormState> {
  const session = await requireAdmin(PATH);
  const input = parseForm(formData);
  if ("ok" in input) return input;

  if (id === null) {
    const created = await createSector(input);
    log.info("sector.created", { sectorId: created, userId: session.user.id });
  } else {
    if (!z.uuid().safeParse(id).success || !(await updateSector(id, input))) {
      return { ok: false, message: "Sector não encontrado" };
    }
    log.info("sector.updated", { sectorId: id, userId: session.user.id });
  }
  revalidatePath(PATH);
  return { ok: true, message: id === null ? "Criado" : "Guardado" };
}

export async function archiveSectorAction(id: string, archived: boolean) {
  const session = await requireAdmin(PATH);
  if (!z.uuid().safeParse(id).success) return;
  if (await setSectorArchived(id, archived)) {
    log.info(archived ? "sector.archived" : "sector.restored", {
      sectorId: id,
      userId: session.user.id,
    });
    revalidatePath(PATH);
  }
}
