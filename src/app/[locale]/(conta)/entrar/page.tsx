import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { Link } from "@/i18n/navigation";
import { safeNextPath } from "@/lib/safe-redirect";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage({ params, searchParams }: PageProps<"/[locale]/entrar">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next } = await searchParams;
  const t = await getTranslations("Auth");

  return (
    <AuthCard
      title={t("signIn.title")}
      footer={
        <>
          <Link href="/recuperar-password" className="underline">
            {t("signIn.forgot")}
          </Link>
          <p>
            {t("signIn.noAccount")}{" "}
            <Link href="/registo" className="underline">
              {t("signIn.createAccount")}
            </Link>
          </p>
        </>
      }
    >
      <SignInForm next={safeNextPath(next)} />
    </AuthCard>
  );
}
