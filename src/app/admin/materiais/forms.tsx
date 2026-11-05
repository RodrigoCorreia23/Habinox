"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/components/admin/toaster";
import { Button } from "@/components/ui/button";
import { syncNowAction, updateMarginAction } from "./actions";
import { InlineField } from "./inline-field";
import { materialPriceWithMargin } from "./margin-price";

/**
 * Margem de um artigo (guarda ao sair do campo) e o preço com margem ao lado,
 * que acompanha o que se escreve. Devolve duas células da linha da tabela.
 */
export function MarginCells({
  id,
  name,
  unit,
  cost,
  percent,
}: {
  id: string;
  name: string;
  unit: string;
  /** Custo do ERP em texto (`numeric(12,4)`). */
  cost: string;
  /** Margem em percentagem para o campo ("30", "12,5"); "" = por decidir. */
  percent: string;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState(percent);
  const price = materialPriceWithMargin(cost, draft);

  return (
    <>
      <td className="px-4 py-3 align-middle max-xl:p-0 max-md:col-span-2">
        <span className="text-steel mb-1.5 block text-[13px] xl:hidden">Margem</span>
        <InlineField
          name="margin"
          unit="%"
          value={percent}
          placeholder="—"
          label={`Margem de ${name}, em percentagem`}
          onDraftChange={setDraft}
          className="md:w-[13.5rem]"
          inputClassName="md:h-9 md:w-28 md:flex-none"
          commit={async (value) => {
            const form = new FormData();
            form.set("id", id);
            form.set("margin", value);
            const result = await updateMarginAction(null, form);
            if (result?.ok && result.message !== "Guardado.") {
              toast({ tone: "ok", message: result.message });
            }
            return { ok: result?.ok ?? false, message: result?.message };
          }}
        />
      </td>
      <td className="px-4 py-3 text-right align-middle tabular-nums max-xl:p-0 max-xl:text-left max-md:col-span-2 max-md:flex max-md:items-baseline max-md:justify-between">
        <span className="text-steel text-[13px] md:max-xl:mb-1.5 md:max-xl:block xl:hidden">
          Preço com margem
        </span>
        {price ? (
          <span
            className="whitespace-nowrap md:max-xl:inline-block md:max-xl:pt-2"
            title={price.exact ? `Valor exato: ${price.exact}` : undefined}
          >
            {price.price} <span className="text-steel">/ {unit}</span>
          </span>
        ) : (
          <span className="text-steel-light">
            <span aria-hidden>—</span>
            <span className="sr-only">sem margem</span>
          </span>
        )}
      </td>
    </>
  );
}

export function SyncNowButton() {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() =>
        startTransition(async () => {
          const result = await syncNowAction();
          if (!result) return;
          const review = result.reviewFilter;
          toast({
            tone: result.ok ? "ok" : "danger",
            message: result.message,
            action: review
              ? {
                  label: "Ver artigos",
                  onClick: () => router.push(`/admin/materiais?filtro=${review}`),
                }
              : undefined,
          });
        })
      }
    >
      {pending ? (
        <Loader2 aria-hidden className="animate-spin motion-reduce:animate-none" />
      ) : (
        <RefreshCw aria-hidden strokeWidth={1.75} />
      )}
      {/* As duas etiquetas partilham a mesma célula: a largura não muda. */}
      <span className="grid">
        <span className={pending ? "invisible col-start-1 row-start-1" : "col-start-1 row-start-1"}>
          Sincronizar agora
        </span>
        <span className={pending ? "col-start-1 row-start-1" : "invisible col-start-1 row-start-1"}>
          A sincronizar…
        </span>
      </span>
    </Button>
  );
}
