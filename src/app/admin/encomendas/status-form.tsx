"use client";

import { useActionState, useState } from "react";
import { Field, fieldClass, FormStatus } from "@/components/admin/field";
import { submitKeepingValues } from "@/components/admin/submit-keeping-values";
import { Button } from "@/components/ui/button";
import type { OrderStatus } from "@/lib/orders/state";
import { changeStatusAction, type StatusState } from "./actions";
import { ACTION_LABELS } from "./labels";

export function StatusForm({ orderId, next }: { orderId: string; next: readonly OrderStatus[] }) {
  const [state, action, pending] = useActionState<StatusState, FormData>(
    changeStatusAction.bind(null, orderId),
    null,
  );
  const [to, setTo] = useState<OrderStatus | "">(
    next.find((status) => status !== "cancelled") ?? next[0] ?? "",
  );
  if (next.length === 0) {
    return <p className="text-steel text-sm">Estado final: já não muda.</p>;
  }
  const cancelling = to === "cancelled";

  return (
    <form onSubmit={submitKeepingValues(action)} className="grid gap-3">
      <Field label="Próximo passo">
        <select
          name="to"
          value={to}
          onChange={(event) => setTo(event.target.value as OrderStatus)}
          className={fieldClass}
        >
          {next.map((status) => (
            <option key={status} value={status}>
              {ACTION_LABELS[status]}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label={
          cancelling
            ? "Motivo do cancelamento (vai no email ao cliente)"
            : "Nota para o cliente (opcional)"
        }
        hint={
          cancelling
            ? "Se já houve pagamento, o reembolso faz-se à parte."
            : "Vai no email que o cliente recebe."
        }
      >
        <textarea
          name="note"
          rows={3}
          maxLength={1000}
          required={cancelling}
          className={fieldClass}
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button
          type="submit"
          size="sm"
          variant={cancelling ? "destructive" : "default"}
          disabled={pending || !to}
        >
          {to ? ACTION_LABELS[to] : "Escolha"}
        </Button>
        <FormStatus pending={pending} state={state} />
      </div>
    </form>
  );
}
