import { getTranslations } from "next-intl/server";
import { COMPLAINTS_BOOK_URL } from "@/content/legal/company";
import { Link } from "@/i18n/navigation";

/** Ligações legais obrigatórias (termos, privacidade, cookies, Livro de Reclamações, litígios). */
export async function LegalLinks({ className }: { className?: string }) {
  const t = await getTranslations("Shop.legal");
  return (
    <nav aria-label={t("nav")} className={className}>
      <ul className="flex flex-wrap gap-x-5 gap-y-2">
        <li>
          <Link href="/termos" className="hover:text-amber underline-offset-4 hover:underline">
            {t("terms")}
          </Link>
        </li>
        <li>
          <Link href="/privacidade" className="hover:text-amber underline-offset-4 hover:underline">
            {t("privacy")}
          </Link>
        </li>
        <li>
          <Link href="/cookies" className="hover:text-amber underline-offset-4 hover:underline">
            {t("cookies")}
          </Link>
        </li>
        <li>
          <Link
            href="/termos#litigios"
            className="hover:text-amber underline-offset-4 hover:underline"
          >
            {t("disputes")}
          </Link>
        </li>
        <li>
          <a
            href={COMPLAINTS_BOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber underline-offset-4 hover:underline"
          >
            {t("complaints")}
          </a>
        </li>
      </ul>
    </nav>
  );
}
