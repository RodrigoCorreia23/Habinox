"use client";

import { useEffect, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { cn } from "cn";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { fieldClass, FormStatus, textareaClass } from "@/components/admin/field";
import { Button } from "@/components/ui/button";
import type { TranslationStatus } from "@/lib/translation-plan";
import { saveTranslationAction, type TranslationState } from "./actions";

/**
 * Campo de uma tradução: guarda sozinho ao sair do campo (ou com Ctrl+Enter; Enter
 * num campo de uma linha) e mostra o estado na própria linha. Esc desfaz o que ainda
 * não foi guardado. Apagar uma correção faz-se com «Repor tradução automática».
 */
export function TranslationForm({
  field,
  id,
  locale,
  localeName,
  rowLabel,
  pt,
  initial,
  multiline,
  status,
}: {
  field: string;
  id: string;
  locale: string;
  localeName: string;
  rowLabel: string;
  pt: string;
  initial: string;
  multiline: boolean;
  status: TranslationStatus;
}) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [state, setState] = useState<TranslationState>(null);
  const [pending, startTransition] = useTransition();
  const dirty = value.trim() !== saved.trim();
  // O servidor mudou o texto (tradução automática reposta, outra janela): acompanha-o,
  // desde que não esteja a meio de escrever.
  const [serverValue, setServerValue] = useState(initial);
  if (initial !== serverValue) {
    setServerValue(initial);
    if (!dirty) {
      setValue(initial);
      setSaved(initial);
    }
  }

  // Avisa antes de sair da página com texto por guardar.
  useEffect(() => {
    if (!dirty && !pending) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending]);

  function send(text: string) {
    const formData = new FormData();
    formData.set("value", text);
    startTransition(async () => {
      const result = await saveTranslationAction(field, id, locale, null, formData);
      setState(result);
      if (result?.ok) {
        setSaved(text.trim());
        setValue(text.trim());
      }
    });
  }

  function save() {
    if (pending || !dirty) return;
    if (value.trim() === "") {
      // Um campo vazio não apaga a correção sem confirmação: volta ao texto guardado.
      setValue(saved);
      setState({
        ok: false,
        message:
          "A tradução não pode ficar vazia. Para voltar à automática, use «Repor tradução automática».",
      });
      return;
    }
    send(value);
  }

  const inputId = `t-${field}-${id}`;
  const statusId = `${inputId}-estado`;
  const shared = {
    id: inputId,
    name: "value",
    lang: locale,
    value,
    maxLength: 2000,
    placeholder: `Sem tradução em ${localeName.toLowerCase()}`,
    "aria-invalid": state?.ok === false ? true : undefined,
    "aria-describedby": statusId,
    onBlur: save,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValue(event.target.value);
      if (state && !state.ok) setState(null);
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey || !multiline)) {
        event.preventDefault();
        save();
      } else if (event.key === "Escape" && dirty) {
        event.preventDefault();
        setValue(saved);
        setState(null);
      }
    },
  };

  const canAccept = status === "auto" || status === "stale";
  const canReset = status === "manual" || status === "stale";
  const showStatus = dirty || pending || state !== null;

  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <label htmlFor={inputId} className="text-steel text-xs font-medium md:sr-only">
        {localeName}
        <span className="sr-only">
          {" "}
          — {rowLabel}: {pt}
        </span>
      </label>
      <div className="flex items-start gap-2">
        {multiline ? (
          <textarea {...shared} rows={3} className={cn(textareaClass, "min-h-20 flex-1")} />
        ) : (
          <input {...shared} type="text" className={cn(fieldClass, "flex-1")} />
        )}
        {/* Ação leve (ghost, com ícone): o campo continua a ser o elemento principal da
            linha, mesmo quando todas as linhas têm «Aceitar». */}
        {canAccept && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending || dirty}
            title="Marca esta tradução como revista: a tradução automática nunca a substitui."
            onClick={() => send(saved)}
            className="mt-0.5 px-2.5 pointer-coarse:mt-0"
          >
            <Check aria-hidden className="text-steel" strokeWidth={1.75} />
            {status === "stale" ? "Continua certa" : "Aceitar"}
            <span className="sr-only"> — {rowLabel}</span>
          </Button>
        )}
      </div>
      {/* A região do estado está sempre montada (o leitor de ecrã ouve as mudanças). */}
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-x-3 gap-y-1",
          !showStatus && !canReset && "sr-only",
        )}
      >
        <span id={statusId} aria-live="polite">
          {dirty && !pending ? (
            <span className="text-steel text-[13px]/[18px]">
              Por guardar · guarda ao sair do campo
            </span>
          ) : (
            showStatus && <FormStatus pending={pending} state={state} />
          )}
        </span>
        {canReset && (
          <ConfirmButton
            type="button"
            tone="default"
            label="Repor tradução automática"
            question="Repor a tradução automática?"
            consequence="A sua correção é apagada e o texto volta a ser traduzido automaticamente."
            confirmLabel="Sim, repor"
            pending={pending}
            onConfirm={() => send("")}
            className="ml-auto"
          />
        )}
      </div>
    </div>
  );
}
