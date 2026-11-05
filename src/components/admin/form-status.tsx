"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";

type State = { ok: boolean; message?: string } | null;

/**
 * Estado de um formulário ao lado do botão: «A guardar…», «Guardado ✓» (desaparece
 * ao fim de 2,5 s) ou o erro a vermelho.
 */
export function FormStatus({ pending, state }: { pending: boolean; state: State }) {
  // Guarda o resultado que já se escondeu: um envio novo traz um objeto novo.
  const [hidden, setHidden] = useState<State>(null);
  useEffect(() => {
    if (!state?.ok) return;
    const timer = setTimeout(() => setHidden(state), 2500);
    return () => clearTimeout(timer);
  }, [state]);

  let text: string | undefined;
  if (pending) text = "A guardar…";
  else if (state?.ok && hidden !== state)
    text = `${(state.message ?? "Guardado").replace(/\.$/, "")} ✓`;
  else if (state && !state.ok) text = state.message;

  return (
    <span
      role="status"
      className={cn(
        "text-[13px]/[18px]",
        pending ? "text-steel" : state?.ok ? "text-ok" : "text-danger",
      )}
    >
      {text}
    </span>
  );
}
