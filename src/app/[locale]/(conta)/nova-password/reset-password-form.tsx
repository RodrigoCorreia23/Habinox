"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { useAuthErrorMessage } from "@/components/auth/use-auth-error";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("Auth");
  const errorMessage = useAuthErrorMessage();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await authClient.resetPassword({
      newPassword: String(form.get("password")),
      token,
    });
    setPending(false);
    if (error) {
      setError(errorMessage(error));
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="grid gap-4">
        <FormMessage success={t("reset.done")} />
        <Link href="/entrar" className="text-sm underline">
          {t("signIn.title")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field
        id="password"
        label={t("newPassword")}
        hint={t("passwordHint")}
        type="password"
        autoComplete="new-password"
        minLength={10}
        required
      />
      <FormMessage error={error} />
      <Button type="submit" disabled={pending}>
        {t("reset.submit")}
      </Button>
    </form>
  );
}
