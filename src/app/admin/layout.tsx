import type { Metadata } from "next";
import { fontVariables } from "@/lib/fonts";
import { requireAdmin } from "@/server/auth/session";
import "../globals.css";

// Backoffice: só em PT, fora do routing de locale.
export const metadata: Metadata = {
  title: "Abinox · Backoffice",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // Primeira barreira. Cada página/ação do backoffice volta a chamar requireAdmin().
  const session = await requireAdmin();

  return (
    <html lang="pt" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full">
        <aside className="w-56 shrink-0 border-r px-4 py-4">
          <p className="font-semibold tracking-tight">Backoffice</p>
          <p className="text-muted-foreground mt-1 truncate text-xs">{session.user.email}</p>
        </aside>
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
