"use client";

import { useState, useTransition } from "react";
import { Field, textareaClass } from "@/components/admin/field";
import { Notice } from "@/components/admin/notice";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { OrderStatus } from "@/lib/orders/state";
import { changeStatusAction } from "./actions";
import { ACTION_LABELS, STATUS_LABELS } from "./labels";

/** Texto para quando a encomenda já não tem passos. */
const FINAL_TEXT: Partial<Record<OrderStatus, string>> = {
  delivered: "Encomenda concluída. Não há mais passos.",
  cancelled:
    "Encomenda fechada. Se o cliente ainda a quiser, peça-lhe para fazer uma nova encomenda na loja.",
  expired:
    "Encomenda fechada. Se o cliente ainda a quiser, peça-lhe para fazer uma nova encomenda na loja.",
};

function ConfirmSubmit({
  label,
  tone,
  pending,
}: {
  label: string;
  tone: "default" | "danger";
  pending: boolean;
}) {
  return (
    <Button type="submit" variant={tone} pending={pending} pendingLabel="A enviar…">
      {label}
    </Button>
  );
}

/**
 * Confirmação de uma mudança de estado. Muda o estado e manda um email ao cliente,
 * por isso pergunta sempre antes. Fica aberta se o servidor recusar, com o motivo e
 * com a nota que se escreveu (envia por onSubmit: o `<form action>` do React 19 limpava-a).
 * (Variante local do ConfirmDialog da base: precisa de «Voltar» em vez de «Cancelar»,
 * para não se confundir com «Cancelar encomenda», e de ficar aberta no erro.)
 */
function StatusDialog({
  orderId,
  to,
  trigger,
  title,
  tone = "default",
  noteRequired = false,
  noteLabel,
  noteHint,
  children,
}: {
  orderId: string;
  to: OrderStatus;
  trigger: React.ReactNode;
  title: string;
  tone?: "default" | "danger";
  noteRequired?: boolean;
  noteLabel: string;
  noteHint: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const noteId = `nota-${to}`;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            setError(null);
            startTransition(async () => {
              const result = await changeStatusAction(orderId, null, formData);
              if (result?.ok) setOpen(false);
              else setError(result?.message ?? "Não foi possível mudar o estado. Tente de novo.");
            });
          }}
        >
          <input type="hidden" name="to" value={to} />
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="grid gap-2">{children}</div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Field label={noteLabel} hint={noteHint} optional={!noteRequired}>
            <textarea
              id={noteId}
              name="note"
              rows={3}
              maxLength={1000}
              required={noteRequired}
              className={textareaClass}
            />
          </Field>
          {error && <Notice tone="danger">{error}</Notice>}
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Voltar</AlertDialogCancel>
            <ConfirmSubmit label={ACTION_LABELS[to]} tone={tone} pending={pending} />
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Ações de estado de uma encomenda: o passo normal num botão principal e, à parte,
 * cancelar (com motivo obrigatório) e marcar como expirada. Todas pedem confirmação,
 * porque o cliente recebe um email.
 */
export function StatusForm({
  orderId,
  orderNumber,
  status,
  next,
}: {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  next: readonly OrderStatus[];
}) {
  if (next.length === 0) {
    return <p className="text-ink-soft text-sm">{FINAL_TEXT[status] ?? "Não há mais passos."}</p>;
  }
  const main = next.find((to) => to !== "cancelled" && to !== "expired");
  const canCancel = next.includes("cancelled");
  const canExpire = next.includes("expired");

  return (
    <div className="grid gap-4">
      {main && (
        <StatusDialog
          orderId={orderId}
          to={main}
          title={`${ACTION_LABELS[main]}?`}
          noteLabel="Nota para o cliente"
          noteHint="Vai no email, por baixo da mensagem."
          trigger={<Button className="w-full">{ACTION_LABELS[main]}</Button>}
        >
          <p>
            Encomenda <span className="text-ink font-mono">{orderNumber}</span>.
          </p>
          <p>
            O cliente vai receber um email a dizer que a encomenda está{" "}
            <strong className="text-ink font-semibold">{STATUS_LABELS[main]}</strong>. Confirmar?
          </p>
        </StatusDialog>
      )}

      {(canCancel || canExpire) && (
        <div className="border-line-soft flex flex-wrap items-center gap-x-5 gap-y-1 border-t pt-3">
          {canCancel && (
            <StatusDialog
              orderId={orderId}
              to="cancelled"
              tone="danger"
              title={`Cancelar a encomenda ${orderNumber}?`}
              noteRequired
              noteLabel="Motivo do cancelamento"
              noteHint="Vai no email ao cliente."
              trigger={
                <button
                  type="button"
                  className="text-danger focus-visible:ring-amber-ink h-9 rounded-[2px] text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 pointer-coarse:h-11"
                >
                  Cancelar encomenda…
                </button>
              }
            >
              <p>
                O cliente recebe um email com o motivo. A encomenda fica fechada e não se pode
                reabrir.
              </p>
              {status !== "pending_payment" && (
                <p>Esta encomenda já foi paga: o reembolso faz-se à parte, fora do backoffice.</p>
              )}
            </StatusDialog>
          )}
          {canExpire && (
            <StatusDialog
              orderId={orderId}
              to="expired"
              tone="danger"
              title={`Marcar a encomenda ${orderNumber} como expirada?`}
              noteLabel="Nota para o cliente"
              noteHint="Vai no email, por baixo da mensagem."
              trigger={
                <button
                  type="button"
                  className="text-ink-soft hover:text-ink focus-visible:ring-amber-ink h-9 rounded-[2px] text-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 pointer-coarse:h-11"
                >
                  Marcar como expirada…
                </button>
              }
            >
              <p>
                Use quando o cliente não pagou e já não vai pagar. O cliente recebe um email a
                avisar e a encomenda fica fechada.
              </p>
            </StatusDialog>
          )}
        </div>
      )}
    </div>
  );
}
