import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { Link } from "@/i18n/navigation";
import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage({
  params,
}: PageProps<"/[locale]/recuperar-password">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <AuthCard
      title={t("forgot.title")}
      footer={
        <Link href="/entrar" className="underline">
          {t("forgot.back")}
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
