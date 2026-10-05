"use client";

import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { useAuthErrorMessage } from "@/components/auth/use-auth-error";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignUpForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const errorMessage = useAuthErrorMessage();
  const [error, setError] = useState<string | null>(null);
  const [doneFor, setDoneFor] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    setPending(true);
    setError(null);
    const { error } = await authClient.signUp.email({
      name: String(form.get("name")),
      email,
      password: String(form.get("password")),
      // Para onde o link de verificação leva, já com sessão iniciada.
      callbackURL: `/${locale}/conta`,
    });
    setPending(false);
    if (error) {
      setError(errorMessage(error));
      return;
    }
    setDoneFor(email);
  }

  if (doneFor) {
    return <FormMessage success={t("signUp.done", { email: doneFor })} />;
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field id="name" label={t("name")} autoComplete="name" required />
      <Field id="email" label={t("email")} type="email" autoComplete="email" required />
      <Field
        id="password"
        label={t("password")}
        hint={t("passwordHint")}
        type="password"
        autoComplete="new-password"
        minLength={10}
        required
      />
      <FormMessage error={error} />
      <Button type="submit" disabled={pending}>
        {t("signUp.submit")}
      </Button>
    </form>
  );
}
