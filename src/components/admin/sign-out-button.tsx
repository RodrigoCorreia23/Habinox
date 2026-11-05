"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";

/** «Sair»: termina a sessão e volta à página inicial. */
export function SignOutButton() {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={async () => {
        setPending(true);
        try {
          await authClient.signOut();
        } finally {
          // Recarregar de propósito: limpa a cache do router e qualquer estado da sessão.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign("/");
        }
      }}
      className="text-rail-text hover:bg-rail-hover hover:text-rail-text-strong focus-visible:ring-amber inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[2px] px-2 text-xs outline-none focus-visible:ring-2 disabled:opacity-60 pointer-coarse:h-11"
    >
      <LogOut aria-hidden className="size-3.5" strokeWidth={1.5} />
      {pending ? "A sair…" : "Sair"}
    </button>
  );
}
