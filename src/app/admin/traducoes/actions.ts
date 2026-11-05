"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { log } from "@/lib/log";
import { CONTENT_LOCALES } from "@/lib/localized";
import { requireAdmin } from "@/server/auth/session";
import { findField, saveManualTranslation, translatePending } from "@/server/catalog/translations";

export type TranslationState = { ok: boolean; message: string } | null;

const localeSchema = z.enum(CONTENT_LOCALES.filter((locale) => locale !== "pt") as ["en"]);

export async function saveTranslationAction(
  fieldKey: string,
  id: string,
  locale: string,
  _previous: TranslationState,
  formData: FormData,
): Promise<TranslationState> {
  const session = await requireAdmin("/admin/traducoes");
  const field = findField(fieldKey);
  const parsedLocale = localeSchema.safeParse(locale);
  if (!field || !parsedLocale.success || !z.uuid().safeParse(id).success) {
    return { ok: false, message: "Este texto já não existe no catálogo. Recarregue a página." };
  }
  const text = String(formData.get("value") ?? "")
    .replace(/\r\n/g, "\n")
    .trim();
  if (text.length > 2000) {
    return { ok: false, message: "Texto demasiado longo: escreva no máximo 2000 caracteres." };
  }

  if (!(await saveManualTranslation(field, id, parsedLocale.data, text))) {
    return { ok: false, message: "Este texto já não existe no catálogo. Recarregue a página." };
  }
  log.info("translation.saved", { field: field.key, id, locale, userId: session.user.id });
  revalidatePath("/", "layout");
  let message = "Guardado";
  if (!text) {
    // Apagada: volta ao automático e é traduzida de novo.
    const summary = await translatePending();
    message = summary.translator
      ? "Tradução automática reposta"
      : "Correção apagada; fica por traduzir até a tradução automática estar ligada";
  }
  revalidatePath("/admin/traducoes");
  return { ok: true, message };
}

export type RunState = { ok: boolean; message: string } | null;

/** "Traduzir o que falta": corre já a tradução automática (normalmente corre sozinha). */
export async function translateNowAction(): Promise<RunState> {
  const session = await requireAdmin("/admin/traducoes");
  const summary = await translatePending();
  log.info("translations.manual_run", { ...summary, userId: session.user.id });
  revalidatePath("/", "layout");
  if (!summary.translator) {
    return {
      ok: false,
      message: "A tradução automática não está ligada neste site. Avise o Rodrigo.",
    };
  }
  if (summary.failed > 0) {
    return {
      ok: false,
      message: `${summary.translated} ${summary.translated === 1 ? "texto traduzido" : "textos traduzidos"}; ${summary.failed} não ${summary.failed === 1 ? "foi" : "foram"} (o serviço de tradução não respondeu). Tente outra vez daqui a uns minutos.`,
    };
  }
  return {
    ok: true,
    message:
      summary.translated === 0
        ? "Não faltava traduzir nada."
        : `${summary.translated} ${summary.translated === 1 ? "texto traduzido" : "textos traduzidos"}${summary.pending ? `; faltam ${summary.pending}, carregue outra vez` : ""}.`,
  };
}
