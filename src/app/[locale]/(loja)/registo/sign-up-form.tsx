"use client";

import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { useAuthErrorMessage } from "@/components/auth/use-auth-error";
import { authClient } from "@/lib/auth-client";

/** next: para onde voltar depois de confirmar o email (ex.: o checkout de onde veio). */
export function SignUpForm({ next }: { next: string | null }) {
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
    const body = {
      name: String(form.get("name")),
      email,
      password: String(form.get("password")),
      // Para onde o link de verificação leva, já com sessão iniciada.
      callbackURL: next ?? `/${locale}/conta`,
      // Consentimentos (RGPD): o servidor recusa sem os termos e grava ambos em
      // `consents` (src/server/auth/sign-up-consents.ts). Não são campos do
      // utilizador, por isso o tipo do cliente não os conhece.
      acceptTerms: form.get("acceptTerms") === "on",
      acceptMarketing: form.get("acceptMarketing") === "on",
    };
    const { error } = await authClient.signUp.email(body);
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
    <form onSubmit={onSubmit} className="grid gap-5">
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
      <div className="grid gap-3 pt-1">
        <label className="flex items-start gap-3 text-sm leading-relaxed">
          <input
            type="checkbox"
            name="acceptTerms"
            required
            className="accent-amber mt-0.5 size-5 shrink-0"
          />
          <span>
            {t.rich("signUp.acceptTerms", {
              terms: (chunks) => (
                <a
                  href={`/${locale}/termos`}
                  target="_blank"
                  className="text-amber underline underline-offset-4"
                >
                  {chunks}
                </a>
              ),
              privacy: (chunks) => (
                <a
                  href={`/${locale}/privacidade`}
                  target="_blank"
                  className="text-amber underline underline-offset-4"
                >
                  {chunks}
                </a>
              ),
            })}
          </span>
        </label>
        <label className="text-night-soft flex items-start gap-3 text-sm leading-relaxed">
          <input
            type="checkbox"
            name="acceptMarketing"
            className="accent-amber mt-0.5 size-5 shrink-0"
          />
          <span>{t("signUp.acceptMarketing")}</span>
        </label>
      </div>
      <FormMessage error={error} />
      <SubmitButton pending={pending}>{t("signUp.submit")}</SubmitButton>
    </form>
  );
}
