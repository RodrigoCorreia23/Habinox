"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import {
  ClipboardList,
  FolderTree,
  GitBranch,
  Languages,
  Layers,
  LayoutDashboard,
  type LucideIcon,
  Package,
  Settings2,
  SlidersHorizontal,
  Users,
  Wrench,
} from "lucide-react";

/** Contagens da navegação (vêm de getAdminCounts no layout). */
export type NavCounts = {
  ordersToHandle: number;
  materialsAttention: number;
  sectorsWithoutMargin: number;
};

type CountKey = keyof NavCounts;

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Contagem de trabalho por fazer (só aparece quando é maior do que 0). */
  countKey?: CountKey;
  /** Subitem indentado (ex.: Regras dentro de Opções). */
  sub?: boolean;
};

export type NavGroup = { group: string | null; items: NavItem[] };

/** Navegação agrupada pelo trabalho: vendas, catálogo pela ordem em que se cria, custos e configuração. */
export const NAV_GROUPS: NavGroup[] = [
  { group: null, items: [{ href: "/admin", label: "Painel", icon: LayoutDashboard }] },
  {
    group: "Vendas",
    items: [
      {
        href: "/admin/encomendas",
        label: "Encomendas",
        icon: ClipboardList,
        countKey: "ordersToHandle",
      },
      { href: "/admin/clientes", label: "Clientes", icon: Users },
    ],
  },
  {
    group: "Catálogo",
    items: [
      { href: "/admin/categorias", label: "Categorias", icon: FolderTree },
      { href: "/admin/opcoes", label: "Opções", icon: SlidersHorizontal },
      { href: "/admin/opcoes/regras", label: "Regras", icon: GitBranch, sub: true },
      { href: "/admin/produtos", label: "Produtos", icon: Package },
    ],
  },
  {
    group: "Custos",
    items: [
      {
        href: "/admin/materiais",
        label: "Materiais e custos",
        icon: Layers,
        countKey: "materialsAttention",
      },
      {
        href: "/admin/mao-de-obra",
        label: "Mão de obra",
        icon: Wrench,
        countKey: "sectorsWithoutMargin",
      },
    ],
  },
  {
    group: "Configuração",
    items: [
      { href: "/admin/traducoes", label: "Traduções", icon: Languages },
      { href: "/admin/parametros", label: "Parâmetros", icon: Settings2 },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

/** O item ativo é o href mais longo que é prefixo do caminho (/admin/opcoes/regras → Regras). */
export function activeNavItem(pathname: string): NavItem | undefined {
  return ALL_ITEMS.filter(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];
}

/** A contagem dita por extenso, para o leitor de ecrã. */
function countText(key: CountKey, n: number) {
  switch (key) {
    case "ordersToHandle":
      return `${n} por tratar`;
    case "materialsAttention":
      return n === 1 ? "1 precisa de atenção" : `${n} precisam de atenção`;
    case "sectorsWithoutMargin":
      return n === 1 ? "1 secção sem margem" : `${n} secções sem margem`;
  }
}

export function AdminNav({
  counts,
  variant = "rail",
  onNavigate,
}: {
  counts: NavCounts;
  variant?: "rail" | "sheet";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = activeNavItem(pathname);

  return (
    <nav aria-label="Backoffice" className="px-2 pb-4">
      {NAV_GROUPS.map(({ group, items }) => (
        <div key={group ?? "inicio"} className={group ? "" : "mt-2"}>
          {group && <p className="text-rail-muted mt-6 mb-1 px-3 text-xs">{group}</p>}
          <ul className="grid gap-px">
            {items.map((item) => {
              const current = item === active;
              const n = item.countKey ? counts[item.countKey] : 0;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={current ? "page" : undefined}
                    aria-label={
                      item.countKey && n > 0
                        ? `${item.label}, ${countText(item.countKey, n)}`
                        : undefined
                    }
                    className={cn(
                      "group/nav relative flex items-center gap-2.5 rounded-[2px] px-3 text-sm transition-colors duration-150 outline-none",
                      "focus-visible:ring-amber focus-visible:ring-2",
                      variant === "sheet" ? "h-11" : "h-9 pointer-coarse:h-11",
                      item.sub && "pl-9",
                      current
                        ? "bg-rail-active text-rail-text-strong before:bg-amber font-medium before:absolute before:top-1/2 before:left-0 before:h-3 before:w-0.5 before:-translate-y-1/2"
                        : "text-rail-text hover:bg-rail-hover hover:text-rail-text-strong",
                    )}
                  >
                    <Icon
                      aria-hidden
                      className={cn(
                        "size-4 shrink-0",
                        current
                          ? "text-rail-text-strong"
                          : "text-rail-muted group-hover/nav:text-rail-text",
                      )}
                      strokeWidth={1.5}
                    />
                    <span className="min-w-0 truncate">{item.label}</span>
                    {n > 0 && (
                      <span aria-hidden className="ml-auto flex items-center gap-1.5">
                        <span className="bg-amber size-1.5" />
                        <span className="text-rail-text-strong text-xs tabular-nums">{n}</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
