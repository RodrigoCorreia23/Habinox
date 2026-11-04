"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { submitKeepingValues } from "@/components/admin/submit-keeping-values";
import { Button } from "@/components/ui/button";
import { keyFromName } from "@/lib/options";
import {
  archiveOptionAction,
  archiveValueAction,
  createOptionAction,
  type FormState,
  saveValueAction,
  updateOptionAction,
} from "./actions";

const fieldClass =
  "border-line-strong focus-visible:ring-brand/40 aria-invalid:border-error rounded-[2px] border bg-white px-2 py-1.5 text-sm outline-none focus-visible:ring-2";

const TYPE_HELP: Record<string, string> = {
  dimension:
    "Um valor em mm, cm ou m que o cliente escreve (largura, altura…). Na fórmula entra em metros.",
  number: "Um número sem unidade (n.º de cantos, n.º de varões…).",
  choice: "O cliente escolhe um de vários valores (material, cor, motorização…).",
  boolean: "Sim ou não (iluminação, fechadura elétrica…). Na fórmula vale 1 ou 0.",
};

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-steel text-xs">{hint}</span>}
      {error && <span className="text-error text-xs">{error}</span>}
    </label>
  );
}

export interface OptionFormValues {
  name: string;
  key: string;
  type: string;
  unit: string;
  display: string;
  helpText: string;
}

export function OptionForm({ id, initial }: { id: string | null; initial: OptionFormValues }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    id ? updateOptionAction.bind(null, id) : createOptionAction,
    null,
  );
  const [name, setName] = useState(initial.name);
  const [key, setKey] = useState(initial.key);
  const [keyTouched, setKeyTouched] = useState(initial.key !== "");
  const [type, setType] = useState(initial.type);
  const errors = state?.fieldErrors ?? {};
  const editing = id !== null;

  return (
    <form onSubmit={submitKeepingValues(action)} className="grid max-w-xl gap-4">
      <Field label="Nome que o cliente vê" error={errors.name}>
        <input
          name="name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (!keyTouched) setKey(keyFromName(event.target.value));
          }}
          required
          maxLength={80}
          aria-invalid={Boolean(errors.name) || undefined}
          className={fieldClass}
        />
      </Field>

      <Field
        label="Chave (nome técnico)"
        error={errors.key}
        hint={
          editing
            ? "Não muda depois de criada: os orçamentos e as fórmulas usam-na."
            : "Gerada a partir do nome. Não poderá mudar depois de criada."
        }
      >
        <input
          name="key"
          value={key}
          onChange={(event) => {
            setKeyTouched(true);
            setKey(event.target.value);
          }}
          readOnly={editing}
          required
          maxLength={40}
          aria-invalid={Boolean(errors.key) || undefined}
          className={`${fieldClass} font-mono read-only:bg-surface-alt`}
        />
      </Field>

      <Field label="Tipo" error={errors.type} hint={TYPE_HELP[type]}>
        {editing ? (
          <>
            <input type="hidden" name="type" value={type} />
            <span className="text-sm">{TYPE_LABELS[type] ?? type}</span>
          </>
        ) : (
          <select
            name="type"
            value={type}
            onChange={(event) => setType(event.target.value)}
            className={fieldClass}
          >
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        )}
      </Field>

      {type === "dimension" && (
        <Field
          label="Unidade que o cliente vê"
          hint="Guarda-se sempre em mm; isto é só a apresentação."
        >
          <select name="unit" defaultValue={initial.unit || "mm"} className={fieldClass}>
            <option value="mm">mm</option>
            <option value="cm">cm</option>
            <option value="m">m</option>
          </select>
        </Field>
      )}

      {type === "choice" && (
        <Field label="Apresentação">
          <select name="display" defaultValue={initial.display || "pills"} className={fieldClass}>
            <option value="pills">Botões</option>
            <option value="list">Lista</option>
            <option value="swatches">Amostras de cor</option>
          </select>
        </Field>
      )}

      <Field label="Ajuda para o cliente (opcional)" error={errors.helpText}>
        <textarea
          name="helpText"
          defaultValue={initial.helpText}
          rows={2}
          maxLength={500}
          className={fieldClass}
        />
      </Field>

      {state?.message && (
        <p role="status" className={`text-sm ${state.ok ? "text-steel" : "text-error"}`}>
          {state.message}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "A guardar…" : editing ? "Guardar alterações" : "Criar opção"}
        </Button>
        {!editing && (
          <Button asChild variant="ghost">
            <Link href="/admin/opcoes">Cancelar</Link>
          </Button>
        )}
      </div>
    </form>
  );
}

const TYPE_LABELS: Record<string, string> = {
  dimension: "Medida",
  number: "Número",
  choice: "Escolha",
  boolean: "Sim / não",
};

export function ArchiveOptionButton({ id, archived }: { id: string; archived: boolean }) {
  return (
    <form action={archiveOptionAction.bind(null, id, !archived)}>
      <Button type="submit" size="sm" variant="ghost">
        {archived ? "Repor" : "Arquivar opção"}
      </Button>
    </form>
  );
}

export interface ValueFormValues {
  label: string;
  key: string;
  position: number;
  params: string;
  ralCode: string;
  swatchHex: string;
  materialId: string;
  asksText: boolean;
}

export function ValueForm({
  optionId,
  valueId,
  initial,
  swatches,
  articles,
}: {
  optionId: string;
  valueId: string | null;
  initial: ValueFormValues;
  swatches: boolean;
  articles: { id: string; name: string; erpCode: string }[];
}) {
  const [label, setLabel] = useState(initial.label);
  const [key, setKey] = useState(initial.key);
  const [keyTouched, setKeyTouched] = useState(initial.key !== "");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<FormState, FormData>(
    async (previous, formData) => {
      const result = await saveValueAction(optionId, valueId, previous, formData);
      // Depois de criar, o formulário do valor novo volta a ficar vazio.
      if (valueId === null && result?.ok) {
        formRef.current?.reset();
        setLabel("");
        setKey("");
        setKeyTouched(false);
      }
      return result;
    },
    null,
  );
  const errors = state?.fieldErrors ?? {};

  return (
    <form
      ref={formRef}
      onSubmit={submitKeepingValues(action)}
      className="grid gap-3 md:grid-cols-[2fr_1.4fr_0.6fr_2fr]"
    >
      <Field label="Nome" error={errors.label}>
        <input
          name="label"
          value={label}
          onChange={(event) => {
            setLabel(event.target.value);
            if (!keyTouched) setKey(keyFromName(event.target.value));
          }}
          required
          maxLength={80}
          aria-invalid={Boolean(errors.label) || undefined}
          className={fieldClass}
        />
      </Field>
      <Field label="Chave" error={errors.key}>
        <input
          name="key"
          value={key}
          onChange={(event) => {
            setKeyTouched(true);
            setKey(event.target.value);
          }}
          readOnly={valueId !== null}
          required
          maxLength={40}
          aria-invalid={Boolean(errors.key) || undefined}
          className={`${fieldClass} font-mono read-only:bg-surface-alt`}
        />
      </Field>
      <Field label="Ordem" error={errors.position}>
        <input
          name="position"
          type="number"
          min={0}
          max={9999}
          defaultValue={initial.position}
          className={fieldClass}
        />
      </Field>
      <Field
        label="Artigo que acrescenta (opcional)"
        error={errors.materialId}
        hint="Ex.: o kit do motor. Entra no preço com quantidade 1."
      >
        <select name="materialId" defaultValue={initial.materialId} className={fieldClass}>
          <option value="">Nenhum</option>
          {articles.map((article) => (
            <option key={article.id} value={article.id}>
              {article.name} ({article.erpCode})
            </option>
          ))}
        </select>
      </Field>
      <div className="md:col-span-2">
        <Field
          label="Números para a fórmula (opcional)"
          error={errors.params}
          hint="nome=número separados por ; — usam-se como opção.nome (ex.: valor=0,12)"
        >
          <input
            name="params"
            defaultValue={initial.params}
            className={`${fieldClass} font-mono`}
          />
        </Field>
      </div>
      {swatches && (
        <>
          <Field label="Código RAL" error={errors.ralCode}>
            <input
              name="ralCode"
              defaultValue={initial.ralCode}
              maxLength={20}
              className={fieldClass}
            />
          </Field>
          <Field label="Cor da amostra" error={errors.swatchHex}>
            <input
              name="swatchHex"
              type="color"
              defaultValue={initial.swatchHex || "#808080"}
              className="border-line-strong h-9 w-16 rounded-[2px] border bg-white"
            />
          </Field>
        </>
      )}
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input
          type="checkbox"
          name="asksText"
          defaultChecked={initial.asksText}
          className="accent-brand size-4"
        />
        Pedir texto ao cliente (ex.: “Outra cor RAL → qual?”)
      </label>
      <div className="flex items-center gap-3 md:col-span-2 md:justify-end">
        <span
          role="status"
          className={`text-xs ${state?.ok === false ? "text-error" : "text-steel"}`}
        >
          {pending ? "A guardar…" : state?.message}
        </span>
        <Button
          type="submit"
          size="sm"
          variant={valueId ? "outline" : "default"}
          disabled={pending}
        >
          {valueId ? "Guardar valor" : "Acrescentar valor"}
        </Button>
      </div>
    </form>
  );
}

export function ArchiveValueButton({ id, archived }: { id: string; archived: boolean }) {
  return (
    <form action={archiveValueAction.bind(null, id, !archived)}>
      <Button type="submit" size="sm" variant="ghost">
        {archived ? "Repor" : "Arquivar valor"}
      </Button>
    </form>
  );
}
