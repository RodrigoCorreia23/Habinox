"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const t = useTranslations("Account");
  const locale = useLocale();
  const router = useRouter();

  async function onClick() {
    await authClient.signOut();
    router.push(`/${locale}`);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-night-soft hover:text-amber min-h-11 text-sm underline underline-offset-4"
    >
      {t("signOut")}
    </button>
  );
}
