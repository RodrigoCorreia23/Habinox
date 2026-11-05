import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/safe-redirect";

// O login passou para a página inicial (estado "entrar", sobre a cena), como no protótipo.
export default async function SignInPage({ params, searchParams }: PageProps<"/[locale]/entrar">) {
  const { locale } = await params;
  const next = safeNextPath((await searchParams).next);
  redirect(`/${locale}${next ? `?next=${encodeURIComponent(next)}` : ""}#entrar`);
}
