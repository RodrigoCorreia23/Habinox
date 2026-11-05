import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { Link } from "@/i18n/navigation";

/** 404 no visual da loja: diz o que aconteceu e leva de volta às categorias. */
export async function NotFoundContent() {
  const t = await getTranslations("NotFound");
  return (
    <AuthCard title={t("title")} accent={t("accent")} image="/home/1920/f080.webp">
      <p className="text-night-soft text-base">{t("body")}</p>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <Link
          href="/#familias"
          className="bg-amber text-on-amber hover:bg-amber-hover focus-visible:outline-night-text inline-flex min-h-[58px] items-center px-8 text-base font-medium outline-offset-3 focus-visible:outline-2"
        >
          {t("shop")}
        </Link>
        <Link
          href="/#inicio"
          className="text-night-text decoration-night-line-strong hover:text-amber inline-flex min-h-11 items-center underline underline-offset-4"
        >
          {t("home")}
        </Link>
      </div>
    </AuthCard>
  );
}
