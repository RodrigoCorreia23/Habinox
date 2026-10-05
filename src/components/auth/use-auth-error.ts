"use client";

import { useTranslations } from "next-intl";

/** Traduz o código de erro do Better Auth; códigos desconhecidos dão mensagem genérica. */
export function useAuthErrorMessage() {
  const t = useTranslations("Auth.errors");
  return (error: { code?: string; status?: number } | null | undefined): string | null => {
    if (!error) return null;
    if (error.status === 429) return t("TOO_MANY_REQUESTS");
    const key = error.code;
    return key && t.has(key) ? t(key) : t("generic");
  };
}
