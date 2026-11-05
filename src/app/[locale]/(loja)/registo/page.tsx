import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { Link } from "@/i18n/navigation";
import { SignUpForm } from "./sign-up-form";

export default async function SignUpPage({ params }: PageProps<"/[locale]/registo">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <AuthCard
      title={t("signUp.title")}
      accent={t("signUp.accent")}
      footer={
        <p>
          {t("signUp.hasAccount")}{" "}
          <Link
            href="/entrar"
            className="text-night-text decoration-night-line-strong hover:text-amber min-h-11 underline underline-offset-4"
          >
            {t("signUp.signIn")}
          </Link>
        </p>
      }
    >
      <SignUpForm />
    </AuthCard>
  );
}
