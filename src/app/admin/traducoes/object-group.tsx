"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

/**
 * Um produto, categoria ou opção com as suas traduções, recolhível. Abre por defeito
 * quando tem trabalho pendente; depois fica como o Bruno o deixar (guardar uma
 * tradução não o fecha). O cabeçalho das colunas fica preso ao fazer scroll.
 */
export function ObjectGroup({
  name,
  meta,
  summary,
  localeName,
  defaultOpen,
  children,
}: {
  name: string;
  meta?: React.ReactNode;
  summary: React.ReactNode;
  localeName: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group/object"
    >
      <summary className="hover:bg-surface-alt/60 focus-visible:ring-amber-ink flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-2.5 transition-colors duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-inset pointer-coarse:min-h-14 [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden
          className="text-steel size-4 shrink-0 transition-transform duration-150 group-open/object:rotate-90"
          strokeWidth={1.75}
        />
        <span className="min-w-0 flex-1">
          <span className="text-ink block truncate text-[15px]/[22px] font-semibold">{name}</span>
          {meta && <span className="text-steel block text-[13px]/[18px]">{meta}</span>}
        </span>
        <span className="shrink-0 text-right text-[13px]/[18px] tabular-nums">{summary}</span>
      </summary>
      <div
        aria-hidden
        className="border-line-soft bg-surface text-steel sticky top-14 z-10 hidden h-9 grid-cols-2 items-center gap-6 border-y px-4 text-xs font-medium md:grid lg:top-0"
      >
        <span>Português</span>
        <span>{localeName}</span>
      </div>
      <ul className="divide-line-soft divide-y max-md:border-line-soft max-md:border-t">
        {children}
      </ul>
    </details>
  );
}
