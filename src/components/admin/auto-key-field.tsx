"use client";

import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { keyFromName } from "@/lib/options/text";
import { slugify } from "@/lib/slug";
import { Button } from "@/components/ui/button";
import { fieldClass } from "./field";

/**
 * Nome técnico gerado a partir de outro campo do mesmo formulário (followName)
 * enquanto ninguém lhe mexer: a chave usada nas fórmulas (kind="key") ou o
 * endereço na loja (kind="slug"). Mostra-se como uma linha de leitura com «Mudar»;
 * com locked, explica porque já não se pode mudar.
 */
export function AutoKeyField({
  name,
  followName,
  defaultValue = "",
  locked = false,
  lockedReason,
  kind,
  prefix,
  label,
  error,
}: {
  name: string;
  followName: string;
  defaultValue?: string;
  locked?: boolean;
  lockedReason?: string;
  kind: "key" | "slug";
  /** Para slugs: «habinox.pt/pt/portoes/» (o endereço mostra-se com este início). */
  prefix?: string;
  label?: string;
  error?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [editingByHand, setEditing] = useState(false);
  // Com erro (inclusive um que chega depois, da resposta do servidor) o campo fica aberto.
  const editing = editingByHand || Boolean(error);
  const touched = useRef(defaultValue !== "");
  const hiddenRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const derive = kind === "key" ? keyFromName : slugify;

  // Segue o campo do nome (no mesmo <form>) enquanto o valor não for mexido à mão.
  useEffect(() => {
    if (locked) return;
    const form = hiddenRef.current?.form;
    const source = form?.elements.namedItem(followName);
    if (!(source instanceof HTMLInputElement || source instanceof HTMLTextAreaElement)) return;
    const follow = () => {
      if (!touched.current) setValue(derive(source.value));
    };
    source.addEventListener("input", follow);
    return () => source.removeEventListener("input", follow);
  }, [followName, locked, derive]);

  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

  const title = label ?? (kind === "key" ? "Nome usado nas fórmulas" : "Endereço");
  const id = `${name}-auto`;

  return (
    <div className="grid gap-1.5 text-sm">
      {/* O valor segue no hidden, exceto quando o input editável (com o mesmo name) está à vista. */}
      <input
        ref={hiddenRef}
        type="hidden"
        name={editing && !locked ? undefined : name}
        value={value}
      />
      {editing && !locked ? (
        <label className="grid gap-1.5">
          <span className="text-ink font-medium">{title}</span>
          <span className="flex min-w-0 items-center gap-2">
            {kind === "slug" && prefix && (
              <span className="text-steel shrink-0 font-mono text-[13px]">{prefix}</span>
            )}
            <input
              ref={editRef}
              id={id}
              name={name}
              value={value}
              onChange={(event) => {
                touched.current = true;
                setValue(event.target.value);
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={`${id}-aviso${error ? ` ${id}-erro` : ""}`}
              autoComplete="off"
              spellCheck={false}
              className={`${fieldClass} w-full font-mono`}
            />
          </span>
          <span id={`${id}-aviso`} className="text-steel text-[13px]/[18px]">
            {kind === "slug"
              ? "Só letras minúsculas, números e hífenes. Mudar o endereço de algo publicado quebra as ligações antigas."
              : "Só letras minúsculas, números e _. As fórmulas usam este nome: mude-o só antes de o usar."}
          </span>
          {error && (
            <span id={`${id}-erro`} className="text-danger text-[13px]/[18px]">
              {error}
            </span>
          )}
        </label>
      ) : (
        <p className="text-steel flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{title}:</span>
          <span className={kind === "slug" ? "text-ink font-mono text-[13px]" : "text-ink"}>
            {kind === "slug" ? `${prefix ?? ""}${value || "…"}` : value || "…"}
          </span>
          {locked ? (
            <span className="text-steel inline-flex items-center gap-1 text-[13px]">
              <Lock aria-hidden className="size-3.5" strokeWidth={1.75} />
              {lockedReason ?? "Já está em uso e não se pode mudar."}
            </span>
          ) : (
            <Button type="button" variant="link" onClick={() => setEditing(true)}>
              Mudar
            </Button>
          )}
        </p>
      )}
    </div>
  );
}
