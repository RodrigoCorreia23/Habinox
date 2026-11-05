import Image from "next/image";
import Link from "next/link";
import { cn } from "cn";
import { ArrowUpRight } from "lucide-react";
import { AdminNav, type NavCounts } from "@/app/admin/nav";
import { formatDateTime, formatRelative } from "@/lib/format-date";
import type { AdminCounts } from "@/server/admin/counts";
import { MobileNav } from "./mobile-nav";
import { SignOutButton } from "./sign-out-button";

const DOT = { ok: "bg-[#5fb37f]", warn: "bg-[#d6a25e]", critical: "bg-[#e5796f]" } as const;
const HEALTH_TEXT = {
  ok: "a correr bem",
  warn: "com avisos",
  critical: "precisa de atenção",
} as const;

function RailFooter({ sync, email }: { sync: AdminCounts["sync"]; email: string }) {
  const linkClass =
    "flex min-h-8 items-center gap-2 rounded-[2px] px-2 text-xs outline-none hover:bg-rail-hover hover:text-rail-text-strong focus-visible:ring-2 focus-visible:ring-amber pointer-coarse:min-h-11";
  return (
    <div className="border-rail-line mt-auto space-y-1 border-t p-3">
      <Link
        href="/admin/materiais"
        className={cn(linkClass, "text-rail-text")}
        title={
          sync.lastSuccessAt
            ? `Última sincronização com o ERP: ${formatDateTime(sync.lastSuccessAt)}`
            : undefined
        }
      >
        <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", DOT[sync.level])} />
        <span className="min-w-0">
          Custos do ERP:{" "}
          {sync.lastSuccessAt ? formatRelative(sync.lastSuccessAt) : "sem sincronização"}
          <span className="sr-only"> ({HEALTH_TEXT[sync.level]})</span>
        </span>
      </Link>
      <a href="/pt" target="_blank" rel="noopener" className={cn(linkClass, "text-rail-text")}>
        <ArrowUpRight aria-hidden className="text-rail-muted size-3.5" strokeWidth={1.5} />
        Ver a loja
        <span className="sr-only"> (abre noutro separador)</span>
      </a>
      <div className="flex items-center gap-2 pt-1 pl-2">
        <span className="text-rail-muted min-w-0 flex-1 truncate text-xs" title={email}>
          {email}
        </span>
        <SignOutButton />
      </div>
    </div>
  );
}

/**
 * Moldura do backoffice: barra lateral grafite (o night-surface da loja) com o
 * logótipo branco, a navegação agrupada e o rodapé com a saúde do ERP, «Ver a
 * loja» e a sessão. Abaixo de 1024px passa a uma barra de topo com menu.
 */
export function AdminShell({ counts, email }: { counts: AdminCounts; email: string }) {
  const navCounts: NavCounts = {
    ordersToHandle: counts.ordersToHandle,
    materialsAttention: counts.materialsAttention,
    sectorsWithoutMargin: counts.sectorsWithoutMargin,
  };
  const footer = <RailFooter sync={counts.sync} email={email} />;
  return (
    <>
      <a
        href="#conteudo"
        className="focus:bg-amber focus:text-on-amber sr-only z-50 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:rounded-[2px] focus:px-3 focus:py-2 focus:text-sm"
      >
        Saltar para o conteúdo
      </a>
      <aside className="bg-rail text-rail-text hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:overflow-y-auto">
        <div className="flex h-16 shrink-0 items-center gap-2 px-4">
          <Link
            href="/admin"
            className="focus-visible:ring-amber rounded-[2px] outline-none focus-visible:ring-2"
          >
            <Image
              src="/brand/habinox-logo-branco.svg"
              alt="Habinox · Painel"
              width={125}
              height={24}
              priority
            />
          </Link>
          <span className="text-rail-muted text-xs">Backoffice</span>
        </div>
        <AdminNav counts={navCounts} />
        {footer}
      </aside>
      <MobileNav counts={navCounts} footer={footer} />
    </>
  );
}
