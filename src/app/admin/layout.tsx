import type { Metadata } from "next";
import { geistMono, geistSans } from "@/lib/fonts";
import "../globals.css";

// Backoffice: só em PT, fora do routing de locale.
export const metadata: Metadata = {
  title: "Abinox · Backoffice",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="pt" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full">
        <aside className="w-56 shrink-0 border-r px-4 py-4">
          <p className="font-semibold tracking-tight">Backoffice</p>
        </aside>
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
