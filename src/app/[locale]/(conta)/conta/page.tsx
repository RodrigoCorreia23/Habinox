import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";

// Placeholder. Protegida por sessão no passo de autenticação.
export default function AccountPage({ params }: PageProps<"/[locale]/conta">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("Account");

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
    </main>
  );
}
