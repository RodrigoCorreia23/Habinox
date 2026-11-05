"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
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
import { fieldClass } from "./field";

function SubmitConfirm({
  label,
  tone,
  disabled,
}: {
  label: string;
  tone: "danger" | "default";
  disabled: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={tone === "danger" ? "danger" : "default"}
      disabled={disabled}
      pending={pending}
      pendingLabel="A confirmar…"
    >
      {label}
    </Button>
  );
}

/**
 * Confirmação para o que não se desfaz ou tem efeito comercial (publicar, IVA,
 * estado de encomenda com email, apagar dados). O título diz a ação com o nome do
 * objeto; o corpo diz o efeito. Com requireText, só se confirma depois de o escrever.
 *
 * Com formAction, o corpo e os botões ficam dentro de um <form>: campos no corpo
 * (ex.: o motivo de um cancelamento) seguem com o pedido. Com onConfirm, chama-o.
 */
export function ConfirmDialog({
  trigger,
  title,
  children,
  confirmLabel,
  cancelLabel = "Cancelar",
  tone = "danger",
  requireText,
  formAction,
  onConfirm,
  pending = false,
}: {
  trigger: React.ReactNode;
  title: React.ReactNode;
  children?: React.ReactNode;
  confirmLabel: string;
  /** Ex.: «Voltar» quando a ação é ela própria um cancelamento. */
  cancelLabel?: string;
  tone?: "danger" | "default";
  requireText?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
  onConfirm?: () => void | Promise<void>;
  pending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [running, setRunning] = useState(false);
  const blocked =
    requireText !== undefined && typed.trim().toLowerCase() !== requireText.trim().toLowerCase();

  const body = (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        {children && (
          <AlertDialogDescription asChild>
            <div className="grid gap-3">{children}</div>
          </AlertDialogDescription>
        )}
      </AlertDialogHeader>
      {requireText !== undefined && (
        <label className="grid gap-1.5 text-sm">
          <span className="text-ink font-medium">
            Para confirmar, escreva <span className="font-semibold">{requireText}</span>
          </span>
          <input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            className={`${fieldClass} w-full`}
          />
        </label>
      )}
    </>
  );

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setTyped("");
      }}
    >
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        {formAction ? (
          <form
            className="grid gap-4"
            action={async (formData) => {
              await formAction(formData);
              setOpen(false);
              setTyped("");
            }}
          >
            {body}
            <AlertDialogFooter className="sm:justify-end">
              <AlertDialogCancel type="button">{cancelLabel}</AlertDialogCancel>
              <SubmitConfirm label={confirmLabel} tone={tone} disabled={blocked || pending} />
            </AlertDialogFooter>
          </form>
        ) : (
          <>
            {body}
            <AlertDialogFooter className="sm:justify-end">
              <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
              <Button
                type="button"
                variant={tone === "danger" ? "danger" : "default"}
                disabled={blocked}
                pending={pending || running}
                pendingLabel="A confirmar…"
                onClick={async () => {
                  setRunning(true);
                  try {
                    await onConfirm?.();
                    setOpen(false);
                    setTyped("");
                  } finally {
                    setRunning(false);
                  }
                }}
              >
                {confirmLabel}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
