import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// Conta (entrar, registo, área de cliente): ainda com a paleta clara; passa à da loja
// quando estes ecrãs forem redesenhados (o protótipo tem o login sobre a cena 3D).
export default async function AccountLayout({ children }: LayoutProps<"/[locale]">) {
  const t = await getTranslations("Nav");
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex min-h-11 items-center">
            <Image
              src="/brand/habinox-logo-sem-slogan.svg"
              alt="Habinox"
              width={146}
              height={28}
              priority
            />
          </Link>
          <Link href="/conta" className="text-sm">
            {t("account")}
          </Link>
        </nav>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
