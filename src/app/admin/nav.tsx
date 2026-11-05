"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Só as secções que já existem; as outras entram quando forem feitas.
const SECTIONS = [
  { href: "/admin", label: "Painel" },
  { href: "/admin/encomendas", label: "Encomendas" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/categorias", label: "Categorias" },
  { href: "/admin/produtos", label: "Produtos" },
  { href: "/admin/materiais", label: "Materiais e custos" },
  { href: "/admin/mao-de-obra", label: "Mão de obra" },
  { href: "/admin/opcoes", label: "Opções" },
  { href: "/admin/parametros", label: "Parâmetros" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Backoffice"
      className="mt-4 flex flex-wrap gap-1 text-sm md:mt-6 md:grid md:gap-0.5"
    >
      {SECTIONS.map(({ href, label }) => {
        const current = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className="hover:bg-surface-alt aria-[current=page]:bg-ink rounded-[2px] px-2 py-1.5 aria-[current=page]:text-white"
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
