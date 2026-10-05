"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
    <Button variant="outline" onClick={onClick}>
      {t("signOut")}
    </Button>
  );
}
