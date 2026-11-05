"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { cn } from "cn";

export type FilterTab = {
  href: string;
  label: string;
  count?: number;
  current: boolean;
  /** Contagem que pede ação (fica a negrito, em warn). */
  attention?: boolean;
};

/**
 * Filtros por separadores sublinhados, com contagens e o filtro na URL.
 * Em ecrãs estreitos fazem scroll horizontal; o ativo é trazido à vista.
 */
export function FilterTabs({
  label,
  groups,
  className,
}: {
  label: string;
  groups: { label?: string; items: FilterTab[] }[];
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current
      ?.querySelector<HTMLElement>("[aria-current=page]")
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, []);

  return (
    <nav
      ref={ref}
      aria-label={label}
      className={cn(
        "border-line flex items-end gap-6 overflow-x-auto border-b whitespace-nowrap [scrollbar-width:thin]",
        className,
      )}
    >
      {groups.map((group, groupIndex) => (
        <div key={group.label ?? groupIndex} className="flex shrink-0 items-end">
          {group.label && (
            <span className="text-steel-light mr-1 self-center pr-2 text-xs">{group.label}</span>
          )}
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              className={cn(
                "relative inline-flex h-10 items-center gap-1.5 px-3 text-sm outline-none pointer-coarse:h-11",
                "focus-visible:ring-amber-ink rounded-t-[2px] focus-visible:ring-2 focus-visible:ring-inset",
                item.current
                  ? "text-ink after:bg-ink font-medium after:absolute after:inset-x-0 after:-bottom-px after:h-0.5"
                  : "text-steel hover:text-ink",
              )}
            >
              {item.label}
              {item.count !== undefined && (
                <span
                  className={cn(
                    "tabular-nums",
                    item.count === 0
                      ? "text-steel-light"
                      : item.attention
                        ? "text-warn font-semibold"
                        : item.current
                          ? "text-ink-soft"
                          : "text-steel",
                  )}
                >
                  {item.count}
                </span>
              )}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
