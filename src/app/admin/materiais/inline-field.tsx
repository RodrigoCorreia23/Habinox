"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { cn } from "cn";
import { Check, CircleAlert } from "lucide-react";
import { fieldClass, type Unit } from "@/components/admin/field";
import { useDirtyForm } from "@/components/admin/use-dirty-form";

export type InlineStatus = "idle" | "pending" | "saved" | "error";
export type CommitResult = { ok: boolean; message?: string };

/**
 * Campo de edição em linha (margens, custo por hora, nome de uma secção): guarda
 * sozinho ao sair do campo ou com Enter e repõe o valor guardado com Esc. Sem botão
 * Guardar. Enquanto há uma alteração por guardar, o invólucro leva data-dirty (a linha
 * da tabela fica marcada) e o browser pergunta antes de sair da página.
 *
 * O erro aparece por baixo do campo, ligado por aria-describedby, e o foco volta ao campo.
 * O estado «A guardar… / Guardado ✓» aparece ao lado (statusPlacement="inline") ou é
 * passado a quem o mostra (onStatus), quando a linha tem um só sítio para ele.
 *
 * Variante local de InlineEdit (pedido à base: src/components/admin/inline-field.tsx).
 */
export function InlineField({
  name,
  label,
  value,
  commit,
  unit,
  placeholder,
  maxLength,
  inputMode,
  onDraftChange,
  onStatus,
  statusPlacement = "inline",
  className,
  inputClassName,
}: {
  name: string;
  /** Nome acessível do campo («Margem de Tubo ferro 40×40, em percentagem»). */
  label: string;
  /** Valor guardado (vem do servidor). */
  value: string;
  commit: (value: string) => Promise<CommitResult>;
  unit?: Unit;
  placeholder?: string;
  maxLength?: number;
  inputMode?: "decimal" | "text";
  onDraftChange?: (value: string) => void;
  onStatus?: (status: InlineStatus) => void;
  statusPlacement?: "inline" | "none";
  className?: string;
  inputClassName?: string;
}) {
  const [saved, setSaved] = useState(value);
  const [draft, setDraft] = useState(value);
  const [status, setStatus] = useState<InlineStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = `${useId()}-erro`;
  const { formProps, markClean } = useDirtyForm();

  // O servidor mandou um valor novo (depois de guardar ou de outra pessoa mudar):
  // adota-o, se não houver nada por guardar aqui.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (draft.trim() === saved.trim()) {
      setSaved(value);
      setDraft(value);
    }
  }

  const dirty = draft.trim() !== saved.trim();

  // Pergunta antes de sair da página enquanto houver alteração por guardar.
  const markDirty = formProps.onInput;
  useEffect(() => {
    if (dirty) markDirty();
    else markClean();
  }, [dirty, markDirty, markClean]);

  const report = setStatus;
  useEffect(() => {
    onStatus?.(status);
  }, [status, onStatus]);

  // «Guardado ✓» desaparece ao fim de 2,5 s.
  useEffect(() => {
    if (status !== "saved") return;
    const timer = setTimeout(() => setStatus("idle"), 2500);
    return () => clearTimeout(timer);
  }, [status]);

  const save = () => {
    if (!dirty || pending) return;
    const next = draft.trim();
    report("pending");
    startTransition(async () => {
      let result: CommitResult;
      try {
        result = await commit(next);
      } catch {
        result = {
          ok: false,
          message: "Não foi possível guardar. Verifique a ligação e tente outra vez.",
        };
      }
      if (result.ok) {
        setSaved(next);
        setDraft(next);
        setError(null);
        report("saved");
      } else {
        setError(result.message ?? "Não foi possível guardar.");
        report("error");
        inputRef.current?.focus();
      }
    });
  };

  const input = (
    <input
      ref={inputRef}
      name={name}
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value);
        onDraftChange?.(event.target.value);
        if (status === "error") report("idle");
      }}
      onBlur={save}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          save();
        } else if (event.key === "Escape") {
          event.preventDefault();
          setDraft(saved);
          onDraftChange?.(saved);
          setError(null);
          report("idle");
        }
      }}
      aria-label={label}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
      placeholder={placeholder}
      maxLength={maxLength}
      inputMode={inputMode ?? (unit ? "decimal" : "text")}
      autoComplete="off"
      readOnly={pending}
      className={cn(
        fieldClass,
        "w-full read-only:bg-white",
        unit && "pr-12 text-right tabular-nums",
        dirty && "border-amber-ink",
        inputClassName,
      )}
    />
  );

  return (
    <div data-dirty={dirty || pending || undefined} className={cn("min-w-0", className)}>
      <div className="flex items-center gap-3">
        {unit ? (
          <span className="relative inline-flex min-w-0 flex-1">
            {input}
            <span
              aria-hidden
              className="text-steel pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm"
            >
              {unit}
            </span>
          </span>
        ) : (
          <span className="inline-flex min-w-0 flex-1">{input}</span>
        )}
        {statusPlacement === "inline" && <InlineStatusText status={status} />}
      </div>
      {error && (
        <p id={errorId} className="text-danger mt-1.5 flex items-start gap-1.5 text-[13px]/[18px]">
          <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
          {error}
        </p>
      )}
    </div>
  );
}

/** «A guardar…» / «Guardado ✓», num espaço de largura fixa para a linha não saltar. */
export function InlineStatusText({
  status,
  className,
}: {
  status: InlineStatus;
  className?: string;
}) {
  return (
    <span
      role="status"
      className={cn(
        "inline-flex shrink-0 items-center empty:hidden md:w-[5.75rem] md:empty:inline-flex gap-1 text-[13px]/[18px] whitespace-nowrap",
        status === "saved" ? "text-ok" : "text-steel",
        className,
      )}
    >
      {status === "pending" && "A guardar…"}
      {status === "saved" && (
        <>
          Guardado <Check aria-hidden className="size-3.5" strokeWidth={2.25} />
        </>
      )}
    </span>
  );
}
