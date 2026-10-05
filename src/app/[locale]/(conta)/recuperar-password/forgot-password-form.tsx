"use client";

import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { useAuthErrorMessage } from "@/components/auth/use-auth-error";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const errorMessage = useAuthErrorMessage();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await authClient.requestPasswordReset({
      email: String(form.get("email")),
      redirectTo: `/${locale}/nova-password`,
    });
    setPending(false);
    if (error) {
      setError(errorMessage(error));
      return;
    }
    // Mensagem igual exista ou não a conta: não revela que emails estão registados.
    setDone(true);
  }

  if (done) return <FormMessage success={t("forgot.done")} />;

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <p className="text-muted-foreground text-sm">{t("forgot.intro")}</p>
      <Field id="email" label={t("email")} type="email" autoComplete="email" required />
      <FormMessage error={error} />
      <Button type="submit" disabled={pending}>
        {t("forgot.submit")}
      </Button>
    </form>
  );
}
