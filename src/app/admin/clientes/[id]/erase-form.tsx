"use client";

import { useActionState } from "react";
import { submitKeepingValues } from "@/components/admin/submit-keeping-values";
import { Button } from "@/components/ui/button";
import { eraseCustomerAction, type EraseState } from "../actions";

export function EraseForm({ id, email }: { id: string; email: string }) {
  const [state, action, pending] = useActionState<EraseState, FormData>(
    eraseCustomerAction.bind(null, id, email),
    null,
  );
  return (
    <form onSubmit={submitKeepingValues(action)} className="grid max-w-md gap-3">
      <label className="grid gap-1 text-sm">
        <span>
          Para confirmar, escreva o email da conta: <strong className="font-medium">{email}</strong>
        </span>
        <input
          name="confirm"
          autoComplete="off"
          aria-invalid={state?.ok === false ? true : undefined}
          className="border-line-strong focus-visible:ring-brand/40 aria-invalid:border-error h-8 rounded-[2px] border bg-white px-2 text-sm outline-none focus-visible:ring-2"
        />
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" variant="destructive" disabled={pending}>
          {pending ? "A apagar…" : "Apagar conta"}
        </Button>
        <span
          role="status"
          className={`text-xs ${state?.ok === false ? "text-error" : "text-steel"}`}
        >
          {state?.message}
        </span>
      </div>
    </form>
  );
}
