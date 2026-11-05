"use server";

import { revalidatePath } from "next/cache";
import { log } from "@/lib/log";
import { requireAdmin } from "@/server/auth/session";
import { setSetting } from "@/server/settings";
import { EDITABLE_SETTINGS, type EditableSetting, parseSettingInput } from "@/server/settings-form";

export type SettingFormState = { ok: boolean; message: string } | null;

const PATH = "/admin/parametros";

export async function saveSettingAction(
  key: EditableSetting,
  _previous: SettingFormState,
  formData: FormData,
): Promise<SettingFormState> {
  const session = await requireAdmin(PATH);
  if (!(EDITABLE_SETTINGS as readonly string[]).includes(key)) {
    return { ok: false, message: "Parâmetro desconhecido" };
  }
  const parsed = parseSettingInput(key, String(formData.get("value") ?? ""));
  if (!parsed.ok) return parsed;

  const previous = await setSetting(key, parsed.value, session.user.id);
  // Fica no log o antes e o depois: um parâmetro mexe em preços e prazos.
  log.info("setting.updated", { key, previous, value: parsed.value, userId: session.user.id });
  revalidatePath("/", "layout");
  return { ok: true, message: "Guardado" };
}
