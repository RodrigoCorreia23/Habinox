"use client";

/** Formulário de login sobre a cena (estado "entrar"), com o Better Auth. */
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { useAuthErrorMessage } from "@/components/auth/use-auth-error";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import styles from "./home.module.css";

export function SceneSignIn({
  next,
  signedInAs,
}: {
  next: string | null;
  signedInAs: string | null;
}) {
  const t = useTranslations("Home.login");
  const locale = useLocale();
  const router = useRouter();
  const errorMessage = useAuthErrorMessage();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const destination = next ?? `/${locale}/conta`;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
      callbackURL: destination,
    });
    setPending(false);
    if (error) {
      setError(errorMessage(error));
      return;
    }
    router.push(destination);
    router.refresh();
  }

  return (
    <div className={styles.loginBox}>
      <h1 className={styles.lstag}>
        {t("title")} <em>{t("accent")}</em>
      </h1>
      {signedInAs ? (
        <p className={`${styles.loginNote} ${styles.lstag}`}>
          {t("signedInAs", { email: signedInAs })}{" "}
          <Link href="/conta" className={styles.tlink}>
            {t("account")}
          </Link>
        </p>
      ) : (
        <>
          <form onSubmit={onSubmit} className={styles.lstag}>
            <div className={styles.fields}>
              <label htmlFor="login-email">
                {t("email")}
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  aria-invalid={error ? true : undefined}
                />
              </label>
              <label htmlFor="login-password">
                {t("password")}
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  aria-invalid={error ? true : undefined}
                />
              </label>
            </div>
            <button
              type="submit"
              className={`${styles.primary} ${styles.primaryFull}`}
              disabled={pending}
            >
              {pending ? t("submitting") : t("submit")}
            </button>
            {error && (
              <p role="alert" className={styles.loginError}>
                {error}
              </p>
            )}
          </form>
          <p className={`${styles.loginRow} ${styles.lstag}`}>
            <Link href="/recuperar-password" className={styles.tlink}>
              {t("forgot")}
            </Link>
            <Link
              href={next ? `/registo?next=${encodeURIComponent(next)}` : "/registo"}
              className={styles.tlink}
            >
              {t("create")}
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
