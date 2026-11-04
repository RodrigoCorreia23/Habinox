"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitKeepingValues } from "@/components/admin/submit-keeping-values";
import { Button } from "@/components/ui/button";
import { archiveSectorAction, saveSectorAction, type SectorFormState } from "./actions";

const fieldClass =
  "border-line-strong focus-visible:ring-brand/40 aria-invalid:border-error h-8 rounded-[2px] border bg-white px-2 text-sm outline-none focus-visible:ring-2";

export function SectorForm({
  id,
  initial,
}: {
  id: string | null;
  initial: { name: string; rate: string; margin: string };
}) {
  const [state, action, pending] = useActionState<SectorFormState, FormData>(
    saveSectorAction.bind(null, id),
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  // Depois de criar, o formulário de "novo sector" volta a ficar vazio.
  useEffect(() => {
    if (id === null && state?.ok) formRef.current?.reset();
  }, [id, state]);
  const invalid = (field: string) => (state?.field === field ? true : undefined);
  const prefix = id ?? "novo";

  return (
    <form
      ref={formRef}
      onSubmit={submitKeepingValues(action)}
      className="flex flex-wrap items-end gap-3"
    >
      <label className="grid gap-1 text-xs">
        <span className="text-steel">Nome</span>
        <input
          name="name"
          defaultValue={initial.name}
          required
          maxLength={80}
          aria-invalid={invalid("name")}
          placeholder="ex.: Serralharia"
          className={`${fieldClass} w-56`}
        />
      </label>
      <label className="grid gap-1 text-xs">
        <span className="text-steel">Custo por hora</span>
        <span className="relative">
          <input
            name="rate"
            defaultValue={initial.rate}
            required
            inputMode="decimal"
            aria-invalid={invalid("rate")}
            className={`${fieldClass} w-28 pr-9 text-right tabular-nums`}
          />
          <span className="text-steel pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs">
            €/h
          </span>
        </span>
      </label>
      <label className="grid gap-1 text-xs">
        <span className="text-steel">Margem</span>
        <span className="relative">
          <input
            name="margin"
            defaultValue={initial.margin}
            inputMode="decimal"
            placeholder="por decidir"
            aria-invalid={invalid("margin")}
            className={`${fieldClass} w-28 pr-6 text-right tabular-nums placeholder:text-left placeholder:text-xs`}
          />
          <span className="text-steel pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs">
            %
          </span>
        </span>
      </label>
      <Button type="submit" size="sm" variant={id ? "outline" : "default"} disabled={pending}>
        {id ? "Guardar" : "Criar sector"}
      </Button>
      <span
        id={`${prefix}-status`}
        role="status"
        className={`self-center text-xs ${state?.ok === false ? "text-error" : "text-steel"}`}
      >
        {pending ? "A guardar…" : state?.message}
      </span>
    </form>
  );
}

export function ArchiveButton({ id, archived }: { id: string; archived: boolean }) {
  return (
    <form action={archiveSectorAction.bind(null, id, !archived)}>
      <Button type="submit" size="sm" variant="ghost">
        {archived ? "Repor" : "Arquivar"}
      </Button>
    </form>
  );
}
