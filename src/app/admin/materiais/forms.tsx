"use client";

import { useActionState } from "react";
import { submitKeepingValues } from "@/components/admin/submit-keeping-values";
import { Button } from "@/components/ui/button";
import { type ActionState, syncNowAction, updateMarginAction } from "./actions";

export function MarginForm({ id, name, percent }: { id: string; name: string; percent: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateMarginAction, null);

  return (
    <form onSubmit={submitKeepingValues(action)} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <div className="relative">
        <input
          name="margin"
          defaultValue={percent}
          inputMode="decimal"
          aria-label={`Margem de ${name}, em percentagem`}
          aria-invalid={state?.ok === false || undefined}
          placeholder="por decidir"
          className="border-line-strong focus-visible:ring-brand/40 aria-invalid:border-error h-8 w-28 rounded-[2px] border bg-white pr-6 pl-2 text-right text-sm tabular-nums outline-none placeholder:text-left placeholder:text-xs focus-visible:ring-2"
        />
        <span className="text-steel pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-sm">
          %
        </span>
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        Guardar
      </Button>
      <span
        role="status"
        className={`text-xs ${state?.ok === false ? "text-error" : "text-steel"}`}
      >
        {pending ? "A guardar…" : state?.message}
      </span>
    </form>
  );
}

export function SyncNowButton() {
  const [state, action, pending] = useActionState<ActionState>(syncNowAction, null);

  return (
    <form onSubmit={submitKeepingValues(action)} className="flex items-center gap-3">
      <span
        role="status"
        className={`text-sm ${state?.ok === false ? "text-error" : "text-steel"}`}
      >
        {pending ? "A sincronizar…" : state?.message}
      </span>
      <Button type="submit" disabled={pending}>
        Sincronizar agora
      </Button>
    </form>
  );
}
