import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { FormMessage } from "@/components/auth/form-message";
import { Link } from "@/i18n/navigation";
import { ResetPasswordForm } from "./reset-password-form";

// O link do email chega aqui com ?token=… (ou ?error=INVALID_TOKEN se expirou).
export default async function ResetPasswordPage({
  params,
  searchParams,
}: PageProps<"/[locale]/nova-password">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { token, error } = await searchParams;
  const t = await getTranslations("Auth");
  const validToken = typeof token === "string" && token.length > 0 && !error;

  return (
    <AuthCard title={t("reset.title")}>
      {validToken ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="grid gap-4">
          <FormMessage error={t("reset.invalidLink")} />
          <Link href="/recuperar-password" className="text-sm underline">
            {t("reset.requestNew")}
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
