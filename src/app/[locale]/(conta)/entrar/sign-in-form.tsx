"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { useAuthErrorMessage } from "@/components/auth/use-auth-error";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignInForm({ next }: { next: string | null }) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const router = useRouter();
  const errorMessage = useAuthErrorMessage();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
      callbackURL: `/${locale}/conta`,
    });
    setPending(false);
    if (error) {
      setError(errorMessage(error));
      return;
    }
    router.push(next ?? `/${locale}/conta`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field id="email" label={t("email")} type="email" autoComplete="email" required />
      <Field
        id="password"
        label={t("password")}
        type="password"
        autoComplete="current-password"
        required
      />
      <FormMessage error={error} />
      <Button type="submit" disabled={pending}>
        {t("signIn.submit")}
      </Button>
    </form>
  );
}
