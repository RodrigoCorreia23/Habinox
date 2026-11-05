"use server";

import { revalidatePath } from "next/cache";
import { log } from "@/lib/log";
import { requireUser } from "@/server/auth/session";
import { getMarketingConsent, setMarketingConsent } from "@/server/privacy";

/** O cliente autoriza ou retira o contacto comercial. Idempotente: só grava se mudar. */
export async function setMarketingAction(locale: string, granted: boolean) {
  const session = await requireUser(`/${locale}/conta`, locale);
  const current = await getMarketingConsent(session.user.id);
  if (current !== granted) {
    await setMarketingConsent(session.user.id, granted, "account");
    log.info("consent.marketing_changed", { userId: session.user.id, granted });
  }
  revalidatePath(`/${locale}/conta`);
}
