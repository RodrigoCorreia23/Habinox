"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";
import { activeNavItem, AdminNav, type NavCounts } from "@/app/admin/nav";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Telemóvel e tablet (abaixo de 1024px): barra grafite no topo com o menu, o
 * logótipo e o nome da secção; o menu abre uma folha à esquerda com a mesma
 * navegação e o mesmo rodapé. Fecha ao mudar de página e com Esc.
 */
export function MobileNav({ counts, footer }: { counts: NavCounts; footer: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Fecha ao mudar de rota (também com o botão Recuar do browser).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  const section = activeNavItem(pathname)?.label ?? "Backoffice";

  return (
    <header className="bg-rail sticky top-0 z-40 flex h-14 items-center gap-2 pr-4 pl-1 lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          aria-label="Abrir menu"
          className="text-rail-text-strong hover:bg-rail-hover focus-visible:ring-amber inline-flex size-11 shrink-0 items-center justify-center rounded-[2px] outline-none focus-visible:ring-2"
        >
          <Menu className="size-5" strokeWidth={1.5} />
        </SheetTrigger>
        <SheetContent
          side="left"
          className="bg-rail text-rail-text border-rail-line border-r"
          closeClassName="text-rail-text hover:bg-rail-hover hover:text-rail-text-strong focus-visible:ring-amber"
        >
          <SheetTitle className="sr-only">Menu do backoffice</SheetTitle>
          <SheetDescription className="sr-only">Secções do backoffice</SheetDescription>
          <div className="flex h-14 shrink-0 items-center gap-2 px-4">
            <Image src="/brand/habinox-logo-branco.svg" alt="Habinox" width={125} height={24} />
            <span className="text-rail-muted text-xs">Backoffice</span>
          </div>
          <AdminNav counts={counts} variant="sheet" onNavigate={() => setOpen(false)} />
          {footer}
        </SheetContent>
      </Sheet>
      <Link
        href="/admin"
        className="focus-visible:ring-amber shrink-0 rounded-[2px] outline-none focus-visible:ring-2"
      >
        <Image
          src="/brand/habinox-logo-branco.svg"
          alt="Habinox · Painel"
          width={125}
          height={24}
        />
      </Link>
      <span aria-hidden className="bg-rail-line mx-1 h-5 w-px shrink-0" />
      <span className="text-rail-text-strong min-w-0 truncate text-sm">{section}</span>
    </header>
  );
}
