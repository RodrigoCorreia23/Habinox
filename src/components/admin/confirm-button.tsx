"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

/**
 * Confirmação em linha para o que se desfaz (arquivar, retirar, apagar uma linha):
 * o primeiro clique troca o botão, no mesmo sítio, pela pergunta e pela consequência,
 * com [confirmLabel] (já com o foco) e [Não]. Volta ao normal com Esc ou ao fim de 6 s
 * (em ecrãs de toque não há tempo limite).
 *
 * Dentro de um <form>, type="submit" envia-o (ou formAction, se vier); onConfirm serve
 * para ações do cliente.
 */
export function ConfirmButton({
  label,
  question,
  confirmLabel,
  consequence,
  tone = "danger",
  size = "sm",
  type = "submit",
  formAction,
  onConfirm,
  name,
  value,
  pending = false,
  className,
}: {
  label: React.ReactNode;
  question: React.ReactNode;
  confirmLabel: string;
  consequence?: React.ReactNode;
  tone?: "danger" | "default";
  size?: "default" | "sm";
  type?: "submit" | "button";
  formAction?: (formData: FormData) => void | Promise<void>;
  onConfirm?: () => void;
  name?: string;
  value?: string;
  pending?: boolean;
  className?: string;
}) {
  const [asking, setAsking] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);

  useEffect(() => {
    if (asking) {
      confirmRef.current?.focus();
      // Em ecrãs de toque não há tempo limite: o dedo pode demorar.
      if (window.matchMedia("(pointer: coarse)").matches) return;
      const timer = setTimeout(() => setAsking(false), 6000);
      return () => clearTimeout(timer);
    }
    if (returnFocus.current) {
      returnFocus.current = false;
      triggerRef.current?.focus();
    }
  }, [asking]);

  const cancel = () => {
    returnFocus.current = true;
    setAsking(false);
  };

  return (
    <span aria-live="polite" className={cn("inline-flex", className)}>
      {asking ? (
        <span
          className="inline-flex flex-wrap items-center gap-x-3 gap-y-2"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              cancel();
            }
          }}
        >
          <span className="text-sm">
            <span className="text-ink font-medium">{question}</span>
            {consequence && (
              <span className="text-steel block max-w-prose text-[13px]/[18px]">{consequence}</span>
            )}
          </span>
          <span className="inline-flex items-center gap-2">
            <Button
              ref={confirmRef}
              type={type}
              size={size}
              variant={tone === "danger" ? "destructive" : "default"}
              formAction={type === "submit" ? formAction : undefined}
              name={name}
              value={value}
              pending={pending}
              onClick={() => {
                onConfirm?.();
                // Num submit, o formulário segue; o botão volta ao normal a seguir.
                setTimeout(() => setAsking(false), 0);
              }}
            >
              {confirmLabel}
            </Button>
            <Button type="button" size={size} variant="ghost" onClick={cancel}>
              Não
            </Button>
          </span>
        </span>
      ) : (
        <Button
          ref={triggerRef}
          type="button"
          size={size}
          variant={tone === "danger" ? "destructive" : "outline"}
          pending={pending}
          onClick={() => setAsking(true)}
        >
          {label}
        </Button>
      )}
    </span>
  );
}
