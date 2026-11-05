"use server";

import { revalidatePath } from "next/cache";
import { log } from "@/lib/log";
import { requireAdmin } from "@/server/auth/session";
import { sendEmail } from "@/server/email/send";
import { getSetting, setSetting } from "@/server/settings";
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

/**
 * Envia um email de teste para o endereço de avisos guardado, para o Bruno
 * confirmar que os avisos de encomenda nova lhe chegam. Não grava nada.
 */
export async function sendTestEmailAction(): Promise<{ ok: boolean; message: string }> {
  await requireAdmin(PATH);
  const { email } = await getSetting("orders_notify_email");
  try {
    await sendEmail({
      to: email,
      subject: "Habinox · email de teste dos avisos de encomenda",
      text: [
        "Este é um email de teste enviado a partir do backoffice da Habinox (Parâmetros).",
        "",
        "Se o está a ler, os avisos de encomenda nova chegam a este endereço.",
      ].join("\n"),
    });
  } catch (error) {
    log.error("setting.test_email_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      ok: false,
      message: `Não foi possível enviar o email de teste para ${email}. Tente daqui a uns minutos; se voltar a falhar, avise o suporte.`,
    };
  }
  log.info("setting.test_email_sent", {});
  return {
    ok: true,
    message: `Email de teste enviado para ${email}. Se não chegar em poucos minutos, veja a pasta de spam.`,
  };
}
