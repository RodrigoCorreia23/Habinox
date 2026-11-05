"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { CircleAlert } from "lucide-react";
import { AutoKeyField } from "@/components/admin/auto-key-field";
import { Field, fieldClass, Select, textareaClass, UnitInput } from "@/components/admin/field";
import { Advanced } from "@/components/admin/help";
import { Notice } from "@/components/admin/notice";
import { SaveBar } from "@/components/admin/save-bar";
import { SearchSelect } from "@/components/admin/search-select";
import { submitKeepingValues } from "@/components/admin/submit-keeping-values";
import { useToast } from "@/components/admin/toaster";
import { useDirtyForm } from "@/components/admin/use-dirty-form";
import { Button } from "@/components/ui/button";
import {
  addOptionAction,
  createProductAction,
  type FormState,
  updateProductAction,
  updateProductOptionAction,
} from "./actions";
import { useInlineRow, useSavedEffect } from "./[id]/inline-edit-row";

export interface ProductFormValues {
  name: string;
  slug: string;
  categoryId: string;
  description: string;
}

function InlineError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-danger flex items-start gap-1.5 text-[13px]/[18px]">
      <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
      <span>
        <span className="font-medium">Problema:</span> {message}
      </span>
    </p>
  );
}

/**
 * Dados do produto (montra): nome, endereço, categoria e descrição. Criar faz
 * redirect para o editor; editar fica na página, com a barra «Tem alterações por
 * guardar» e um toast quando grava.
 */
export function ProductForm({
  id,
  initial,
  categories,
}: {
  id: string | null;
  initial: ProductFormValues;
  categories: { id: string; label: string; slug: string }[];
}) {
  const formId = `produto-${id ?? "novo"}`;
  const { toast } = useToast();
  const { dirty, formProps, markClean } = useDirtyForm();
  const [state, action, pending] = useActionState<FormState, FormData>(
    id ? updateProductAction.bind(null, id) : createProductAction,
    null,
  );
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const errors = state?.fieldErrors ?? {};
  const category = categories.find((candidate) => candidate.id === categoryId);

  const last = useRef(state);
  useEffect(() => {
    if (state === last.current) return;
    last.current = state;
    if (!state?.ok) return;
    markClean();
    toast({ tone: "ok", message: "Guardado. A loja já mostra a alteração." });
  }, [state, markClean, toast]);

  return (
    <form
      id={formId}
      onSubmit={submitKeepingValues(action)}
      {...(id ? formProps : {})}
      className="grid gap-5"
    >
      <Field label="Nome" error={errors.name}>
        <input
          name="name"
          defaultValue={initial.name}
          required
          maxLength={120}
          autoComplete="off"
          className={fieldClass}
        />
      </Field>
      <AutoKeyField
        name="slug"
        followName="name"
        kind="slug"
        defaultValue={initial.slug}
        prefix={`habinox.pt/pt/loja/${category?.slug ?? "…"}/`}
        error={errors.slug}
      />
      <InlineError message={errors.slug ? `Endereço: ${errors.slug}` : undefined} />
      <Field label="Categoria" error={errors.categoryId}>
        <Select
          name="categoryId"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          required
          aria-invalid={Boolean(errors.categoryId) || undefined}
        >
          <option value="">Escolha…</option>
          {categories.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Descrição"
        optional
        error={errors.description}
        hint="Aparece na página do produto, por baixo do nome."
      >
        <textarea
          name="description"
          defaultValue={initial.description}
          rows={4}
          maxLength={5000}
          className={textareaClass}
        />
      </Field>
      {state?.message && !state.ok && <Notice tone="danger">{state.message}</Notice>}
      {id ? (
        <SaveBar formId={formId} dirty={dirty} pending={pending} />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" pending={pending} pendingLabel="A criar…">
            Criar e continuar
          </Button>
          <Button asChild variant="ghost">
            <Link href="/admin/produtos">Cancelar</Link>
          </Button>
        </div>
      )}
    </form>
  );
}

/** «+ Acrescentar opção da biblioteca»: escolher com pesquisa e acrescentar ao fim. */
export function AddOptionForm({
  productId,
  versionId,
  available,
}: {
  productId: string;
  versionId: string;
  available: { id: string; label: string; hint: string }[];
}) {
  const [resetKey, setResetKey] = useState(0);
  const [state, action, pending] = useActionState<FormState, FormData>(
    async (previous: FormState, formData: FormData) => {
      const result = await addOptionAction(productId, versionId, previous, formData);
      if (result?.ok) setResetKey((key) => key + 1);
      return result;
    },
    null,
  );
  useSavedEffect(state, "Opção acrescentada. Reveja os limites e os valores.");
  if (available.length === 0) {
    return (
      <p className="text-steel text-sm">
        O produto já usa todas as opções da biblioteca.{" "}
        <Link href={`/admin/opcoes/nova?produto=${productId}`} className="link-admin">
          Criar opção nova
        </Link>
      </p>
    );
  }
  return (
    <form onSubmit={submitKeepingValues(action)} className="grid max-w-2xl gap-3">
      <div className="grid gap-1.5 text-sm">
        <span className="text-ink font-medium">Opção da biblioteca</span>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 basis-64">
            <SearchSelect
              key={resetKey}
              name="optionId"
              ariaLabel="Opção da biblioteca"
              placeholder="Escolha a opção…"
              emptyText="Nenhuma opção com esse nome."
              required
              options={available.map((option) => ({
                value: option.id,
                label: option.label,
                hint: option.hint,
              }))}
            />
          </div>
          <Button type="submit" variant="outline" pending={pending}>
            Acrescentar
          </Button>
        </div>
      </div>
      <InlineError message={state?.ok ? undefined : state?.message} />
      <p className="text-steel text-[13px]">
        Não está na lista?{" "}
        <Link href={`/admin/opcoes/nova?produto=${productId}`} className="link-admin">
          Criar opção nova
        </Link>
      </p>
    </form>
  );
}

export interface ProductOptionFormValues {
  type: string;
  name: string;
  optionKey: string;
  var: string;
  required: boolean;
  min: string;
  max: string;
  step: string;
  values: { id: string; label: string; key: string; archived: boolean }[];
  allowed: string[];
  defaultValueId: string;
}

const NUMBER_FIELDS = ["min", "max", "step"] as const;

/** Como esta opção funciona neste produto: limites, valores disponíveis e o que vem escolhido. */
export function ProductOptionForm({
  productId,
  productOptionId,
  initial,
}: {
  productId: string;
  productOptionId: string;
  initial: ProductOptionFormValues;
}) {
  const row = useInlineRow();
  const [state, action, pending] = useActionState<FormState, FormData>(
    updateProductOptionAction.bind(null, productId, productOptionId),
    null,
  );
  useSavedEffect(state, `«${initial.name}» guardada.`);
  const [allowed, setAllowed] = useState<string[]>(initial.allowed);
  const [defaultId, setDefaultId] = useState(initial.defaultValueId);
  const [notice, setNotice] = useState<string | null>(null);
  const dimension = initial.type === "dimension";
  const numeric = dimension || initial.type === "number";
  // Os limites são números inteiros. Verifica-se antes de enviar, para o Bruno ver
  // uma frase clara junto ao campo em vez do erro técnico da validação.
  const [numberErrors, setNumberErrors] = useState<Record<string, string>>({});
  const errors = { ...(state?.fieldErrors ?? {}), ...numberErrors };
  const submit = submitKeepingValues(action);
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const found: Record<string, string> = {};
    if (numeric) {
      for (const name of NUMBER_FIELDS) {
        const field = form.elements.namedItem(name);
        const value = field instanceof HTMLInputElement ? field.value.trim() : "";
        if (value !== "" && !/^\d+$/.test(value)) {
          found[name] = dimension
            ? "Escreva um número inteiro em mm, sem vírgulas (ex.: 2500)."
            : "Escreva um número inteiro, sem vírgulas (ex.: 3).";
        }
      }
    }
    setNumberErrors(found);
    const first = NUMBER_FIELDS.find((name) => found[name]);
    if (first) {
      event.preventDefault();
      const field = form.elements.namedItem(first);
      if (field instanceof HTMLInputElement) field.focus();
      return;
    }
    submit(event);
  };
  // Ao corrigir o campo, o aviso sai.
  const clearNumberError = (name: string) =>
    setNumberErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });

  const numberField = (name: (typeof NUMBER_FIELDS)[number], label: string, hint?: string) => (
    <Field label={label} error={errors[name]} hint={hint} className="w-36">
      {dimension ? (
        <UnitInput
          unit="mm"
          name={name}
          inputMode="numeric"
          defaultValue={initial[name]}
          onInput={() => clearNumberError(name)}
        />
      ) : (
        <input
          name={name}
          inputMode="numeric"
          defaultValue={initial[name]}
          onInput={() => clearNumberError(name)}
          className={`${fieldClass} text-right tabular-nums`}
        />
      )}
    </Field>
  );

  return (
    <form onSubmit={onSubmit} className="grid max-w-3xl gap-5">
      {numeric && (
        <div className="flex flex-wrap items-start gap-4">
          {numberField("min", "Mínimo")}
          {numberField("max", "Máximo")}
          {numberField(
            "step",
            "De quanto em quanto",
            dimension ? "10 mm = de 1 em 1 cm" : undefined,
          )}
        </div>
      )}

      {initial.type === "choice" && (
        <fieldset className="grid gap-2">
          <legend className="text-ink mb-1.5 text-sm font-medium">Valores neste produto</legend>
          {initial.values.length === 0 ? (
            <p className="text-steel text-sm">
              A opção ainda não tem valores.{" "}
              <Link href="/admin/opcoes" className="link-admin">
                Acrescentar valores
              </Link>
            </p>
          ) : (
            <table className="w-full max-w-xl text-sm">
              <thead>
                <tr className="border-line border-b">
                  <th scope="col" className="text-steel h-9 pr-4 text-left text-xs font-medium">
                    Valor
                  </th>
                  <th scope="col" className="text-steel h-9 px-4 text-center text-xs font-medium">
                    Disponível
                  </th>
                  <th scope="col" className="text-steel h-9 pl-4 text-center text-xs font-medium">
                    Vem escolhido
                  </th>
                </tr>
              </thead>
              <tbody>
                {initial.values.map((value) => {
                  const isAllowed = allowed.includes(value.id);
                  return (
                    <tr key={value.id} className="border-line-soft border-b last:border-b-0">
                      <td className="py-2 pr-4">
                        {value.label}
                        {value.archived && (
                          <span className="text-steel ml-2 text-[13px]">(arquivado)</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          name="allowed"
                          value={value.id}
                          checked={isAllowed}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setAllowed((current) =>
                              checked
                                ? [...current, value.id]
                                : current.filter((id) => id !== value.id),
                            );
                            if (!checked && defaultId === value.id) {
                              setDefaultId("");
                              setNotice(
                                `«${value.label}» deixou de vir escolhido: escolha outro, se quiser.`,
                              );
                            }
                          }}
                          aria-label={`${value.label} disponível neste produto`}
                          className="size-4 align-middle"
                        />
                      </td>
                      <td className="py-2 pl-4 text-center">
                        <input
                          type="radio"
                          name="defaultValueId"
                          value={value.id}
                          checked={defaultId === value.id}
                          disabled={!isAllowed}
                          onChange={() => {
                            setDefaultId(value.id);
                            setNotice(null);
                          }}
                          aria-label={`${value.label} vem escolhido`}
                          title={isAllowed ? undefined : "Torne-o disponível primeiro"}
                          className="size-4 align-middle disabled:opacity-40"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <p aria-live="polite" className="text-steel text-[13px]/[18px]">
            {notice}
          </p>
          <InlineError message={errors.allowed} />
        </fieldset>
      )}

      <label className="text-ink flex min-h-10 items-center gap-2 text-sm pointer-coarse:min-h-11">
        <input
          type="checkbox"
          name="required"
          defaultChecked={initial.required}
          className="size-4"
        />
        O cliente tem de preencher
      </label>

      <Advanced open={Boolean(errors.var) || undefined}>
        <Field
          label="Nome usado nas fórmulas"
          error={errors.var}
          hint={`Curto ajuda nas contas (ex.: L para a largura). Vazio: usa «${initial.optionKey}».`}
          className="max-w-xs"
        >
          <input
            name="var"
            defaultValue={initial.var}
            maxLength={30}
            autoComplete="off"
            spellCheck={false}
            className={`${fieldClass} font-mono`}
          />
        </Field>
      </Advanced>

      {state?.message && !state.ok && <Notice tone="danger">{state.message}</Notice>}
      <div className="flex items-center gap-3">
        <Button type="submit" variant={row?.dirty ? "default" : "outline"} pending={pending}>
          Guardar opção
        </Button>
      </div>
    </form>
  );
}
