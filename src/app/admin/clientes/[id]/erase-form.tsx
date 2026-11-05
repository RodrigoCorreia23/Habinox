"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { fieldClass } from "@/components/admin/field";
import { Notice } from "@/components/admin/notice";
import { useToast } from "@/components/admin/toaster";
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
import { eraseCustomerAction } from "../actions";

function EraseSubmit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="danger"
      disabled={disabled}
      pending={pending}
      pendingLabel="A apagar…"
    >
      Apagar conta
    </Button>
  );
}

/**
 * Apagar uma conta a pedido do cliente (RGPD). Não se desfaz: abre uma confirmação
 * que explica o efeito e só deixa continuar depois de se escrever o email da conta.
 * (Variante local do ConfirmDialog da base: o texto escrito segue no pedido como
 * «confirm», que o servidor volta a verificar, e o diálogo fica aberto se houver erro.)
 */
export function EraseForm({ id, email, name }: { id: string; email: string; name: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setTyped("");
          setError(null);
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="text-danger focus-visible:ring-amber-ink h-9 w-fit rounded-[2px] text-left text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 pointer-coarse:h-11"
        >
          Apagar conta a pedido do cliente (RGPD)…
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form
          className="grid gap-4"
          action={async (formData) => {
            setError(null);
            const result = await eraseCustomerAction(id, email, null, formData);
            if (result?.ok) {
              setOpen(false);
              toast({ tone: "ok", message: "Conta apagada. As encomendas ficam guardadas." });
            } else {
              setError(result?.message ?? "Não foi possível apagar a conta. Tente de novo.");
            }
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar a conta de {name}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="grid gap-2">
                <p>
                  O nome e o email saem da conta, as sessões terminam e a password é apagada: o
                  cliente deixa de poder entrar.
                </p>
                <p>
                  As encomendas ficam, com os dados de faturação, porque a lei obriga a guardá-las
                  10 anos. <strong className="text-ink font-semibold">Não se desfaz.</strong>
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="grid gap-1.5 text-sm">
            <span className="text-ink font-medium">
              Para confirmar, escreva o email da conta:{" "}
              <span className="font-semibold break-all">{email}</span>
            </span>
            <input
              name="confirm"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={error ? true : undefined}
              className={`${fieldClass} w-full`}
            />
          </label>
          {error && <Notice tone="danger">{error}</Notice>}
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Voltar</AlertDialogCancel>
            <EraseSubmit disabled={!matches} />
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
