"use client";

import { useEffect } from "react";
import { useToast } from "./toaster";

// Mensagens já mostradas nesta sessão do separador (evita repetir ao voltar atrás).
const shown = new Set<string>();

/** Mostra a mensagem que uma action deixou no cookie admin_flash e apaga o cookie. */
export function FlashToast({
  id,
  tone,
  message,
}: {
  id: string;
  tone: "ok" | "danger" | "info";
  message: string;
}) {
  const { toast } = useToast();
  useEffect(() => {
    document.cookie = "admin_flash=; Max-Age=0; path=/admin; SameSite=Lax";
    if (shown.has(id)) return;
    shown.add(id);
    toast({ tone, message });
  }, [id, tone, message, toast]);
  return null;
}
