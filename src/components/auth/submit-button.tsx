import type { ReactNode } from "react";

/** Botão principal dos formulários de conta (dourado, como "Entrar" na cena). */
export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-amber text-on-amber hover:bg-amber-hover focus-visible:outline-night-text min-h-[58px] w-full px-8 text-base font-medium outline-offset-3 focus-visible:outline-2 active:scale-[0.98] disabled:opacity-60"
    >
      {children}
    </button>
  );
}
