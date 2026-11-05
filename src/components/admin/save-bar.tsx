"use client";

import { Button } from "@/components/ui/button";

/**
 * Barra fixa em baixo com «Tem alterações por guardar», Descartar e Guardar, para
 * formulários de entidade (categoria, opção, dados do produto, parâmetro). Só
 * aparece quando há alterações. Os botões ligam ao formulário por formId.
 */
export function SaveBar({
  formId,
  dirty,
  pending = false,
  submitLabel = "Guardar alterações",
  onDiscard,
}: {
  formId: string;
  dirty: boolean;
  pending?: boolean;
  submitLabel?: string;
  onDiscard?: () => void;
}) {
  if (!dirty && !pending) return null;
  return (
    <div
      role="region"
      aria-label="Alterações por guardar"
      className="bg-surface/95 border-line sticky bottom-0 z-20 -mx-4 mt-8 flex min-h-16 items-center justify-between gap-3 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm md:-mx-8 md:px-8"
    >
      <p className="text-ink flex items-center gap-2 text-sm">
        <span aria-hidden className="bg-amber size-1.5 rounded-full" />
        Tem alterações por guardar
      </p>
      <div className="flex items-center gap-2">
        <Button
          type={onDiscard ? "button" : "reset"}
          form={formId}
          variant="ghost"
          disabled={pending}
          onClick={onDiscard}
        >
          Descartar
        </Button>
        <Button type="submit" form={formId} pending={pending}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
