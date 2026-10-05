import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/server/auth/session";
import { SignOutButton } from "./sign-out-button";

export default async function AccountPage({ params }: PageProps<"/[locale]/conta">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireUser(`/${locale}/conta`, locale);
  const t = await getTranslations("Account");

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground">{t("signedInAs", { email: session.user.email })}</p>
      <div>
        <SignOutButton />
      </div>
    </main>
  );
}
