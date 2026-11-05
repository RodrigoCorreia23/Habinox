"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Menu «⋯» de uma linha: ações secundárias (arquivar, ver na loja…). */
export function RowMenu({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Mais ações para ${label}`}
        >
          <MoreHorizontal strokeWidth={1.75} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RowMenuItem({
  onSelect,
  href,
  tone = "default",
  children,
}: {
  onSelect?: () => void;
  href?: string;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  if (href) {
    return (
      <DropdownMenuItem asChild tone={tone}>
        <Link href={href}>{children}</Link>
      </DropdownMenuItem>
    );
  }
  return (
    <DropdownMenuItem tone={tone} onSelect={onSelect}>
      {children}
    </DropdownMenuItem>
  );
}
