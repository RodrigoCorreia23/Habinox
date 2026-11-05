import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/shell";
import { AdminToaster } from "@/components/admin/toaster";
import { fontVariables } from "@/lib/fonts";
import { getAdminCounts } from "@/server/admin/counts";
import { requireAdmin } from "@/server/auth/session";
import "../globals.css";

// Backoffice: só em PT, fora do routing de locale.
export const metadata: Metadata = {
  title: "Habinox · Backoffice",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // Primeira barreira. Cada página/ação do backoffice volta a chamar requireAdmin().
  const session = await requireAdmin();
  const counts = await getAdminCounts();

  return (
    <html lang="pt" className={`${fontVariables} h-full antialiased`}>
      <body data-admin="" className="bg-canvas text-ink min-h-dvh">
        <AdminToaster>
          {/* Grelha 240px | resto a partir de 1024px; abaixo, barra de topo e conteúdo. */}
          <div className="min-h-dvh lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
            <AdminShell counts={counts} email={session.user.email} />
            <div className="flex min-w-0 flex-col">{children}</div>
          </div>
        </AdminToaster>
      </body>
    </html>
  );
}
