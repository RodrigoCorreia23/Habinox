"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Field, fieldClass, FormStatus } from "@/components/admin/field";
import { submitKeepingValues } from "@/components/admin/submit-keeping-values";
import { Button } from "@/components/ui/button";
import { slugify } from "@/lib/slug";
import {
  addOptionAction,
  createProductAction,
  type FormState,
  updateProductAction,
  updateProductOptionAction,
} from "./actions";

export interface ProductFormValues {
  name: string;
  slug: string;
  categoryId: string;
  description: string;
}

export function ProductForm({
  id,
  initial,
  categories,
}: {
  id: string | null;
  initial: ProductFormValues;
  categories: { id: string; label: string }[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    id ? updateProductAction.bind(null, id) : createProductAction,
    null,
  );
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(initial.slug !== "");
  const errors = state?.fieldErrors ?? {};

  return (
    <form onSubmit={submitKeepingValues(action)} className="grid max-w-xl gap-4">
      <Field label="Nome" error={errors.name}>
        <input
          name="name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (!slugTouched) setSlug(slugify(event.target.value));
          }}
          required
          maxLength={120}
          aria-invalid={Boolean(errors.name) || undefined}
          className={fieldClass}
        />
      </Field>
      <Field
        label="Endereço na loja"
        error={errors.slug}
        hint="Parte do endereço da página. Mudá-lo depois de publicado quebra os links antigos."
      >
        <input
          name="slug"
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value);
          }}
          required
          maxLength={80}
          aria-invalid={Boolean(errors.slug) || undefined}
          className={fieldClass}
        />
      </Field>
      <Field label="Categoria" error={errors.categoryId}>
        <select
          name="categoryId"
          defaultValue={initial.categoryId}
          required
          aria-invalid={Boolean(errors.categoryId) || undefined}
          className={fieldClass}
        >
          <option value="">Escolha…</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Descrição (opcional)" error={errors.description}>
        <textarea
          name="description"
          defaultValue={initial.description}
          rows={4}
          maxLength={5000}
          className={fieldClass}
        />
      </Field>
      {state?.message && !state.ok && (
        <p role="alert" className="text-error text-sm">
          {state.message}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {id ? "Guardar dados do produto" : "Criar produto"}
        </Button>
        {!id && (
          <Button asChild variant="ghost">
            <Link href="/admin/produtos">Cancelar</Link>
          </Button>
        )}
        {id && <FormStatus pending={pending} state={state} />}
      </div>
    </form>
  );
}

export function AddOptionForm({
  productId,
  versionId,
  available,
}: {
  productId: string;
  versionId: string;
  available: { id: string; label: string }[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    addOptionAction.bind(null, productId, versionId),
    null,
  );
  if (available.length === 0) {
    return (
      <p className="text-steel text-sm">
        O produto já usa todas as opções da biblioteca.{" "}
        <Link href="/admin/opcoes/nova" className="text-brand underline-offset-4 hover:underline">
          Criar uma opção nova
        </Link>
      </p>
    );
  }
  return (
    <form onSubmit={submitKeepingValues(action)} className="flex flex-wrap items-end gap-3">
      <Field label="Acrescentar opção da biblioteca">
        <select name="optionId" required className={`${fieldClass} min-w-64`}>
          {available.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
      <Button type="submit" size="sm" disabled={pending}>
        Acrescentar
      </Button>
      <FormStatus pending={pending} state={state} />
    </form>
  );
}

export interface ProductOptionFormValues {
  type: string;
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

export function ProductOptionForm({
  productId,
  productOptionId,
  initial,
}: {
  productId: string;
  productOptionId: string;
  initial: ProductOptionFormValues;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    updateProductOptionAction.bind(null, productId, productOptionId),
    null,
  );
  const errors = state?.fieldErrors ?? {};
  const numeric = initial.type === "dimension" || initial.type === "number";
  const unit = initial.type === "dimension" ? " (mm)" : "";

  return (
    <form onSubmit={submitKeepingValues(action)} className="grid gap-4">
      <div className="flex flex-wrap items-start gap-4">
        <Field
          label="Nome na fórmula"
          error={errors.var}
          hint={
            initial.type === "choice"
              ? `Vazio = ${initial.optionKey}. Os números dos valores usam-se como ${initial.var || initial.optionKey}.nome`
              : `Vazio = ${initial.optionKey}. Curto ajuda: L, H…`
          }
          className="w-64"
        >
          <input
            name="var"
            defaultValue={initial.var}
            maxLength={30}
            aria-invalid={Boolean(errors.var) || undefined}
            className={`${fieldClass} font-mono`}
          />
        </Field>
        {numeric && (
          <>
            <Field label={`Mínimo${unit}`} error={errors.min} className="w-32">
              <input
                name="min"
                type="number"
                min={0}
                defaultValue={initial.min}
                className={`${fieldClass} tabular-nums`}
              />
            </Field>
            <Field label={`Máximo${unit}`} error={errors.max} className="w-32">
              <input
                name="max"
                type="number"
                min={0}
                defaultValue={initial.max}
                className={`${fieldClass} tabular-nums`}
              />
            </Field>
            <Field
              label={`Passo${unit}`}
              error={errors.step}
              hint={initial.type === "dimension" ? "10 = de 1 em 1 cm" : undefined}
              className="w-32"
            >
              <input
                name="step"
                type="number"
                min={1}
                defaultValue={initial.step}
                className={`${fieldClass} tabular-nums`}
              />
            </Field>
          </>
        )}
        <label className="mt-7 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="required"
            defaultChecked={initial.required}
            className="accent-brand size-4"
          />
          Obrigatória
        </label>
      </div>

      {initial.type === "choice" && (
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Valores permitidos neste produto</legend>
          {initial.values.length === 0 ? (
            <p className="text-steel text-sm">A opção ainda não tem valores na biblioteca.</p>
          ) : (
            <table className="text-sm">
              <thead className="text-steel text-left text-xs">
                <tr>
                  <th className="py-1 pr-4 font-medium">Permitido</th>
                  <th className="py-1 pr-4 font-medium">Por omissão</th>
                  <th className="py-1 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {initial.values.map((value) => (
                  <tr key={value.id}>
                    <td className="py-1 pr-4">
                      <input
                        type="checkbox"
                        name="allowed"
                        value={value.id}
                        defaultChecked={initial.allowed.includes(value.id)}
                        aria-label={`Permitir ${value.label}`}
                        className="accent-brand size-4"
                      />
                    </td>
                    <td className="py-1 pr-4">
                      <input
                        type="radio"
                        name="defaultValueId"
                        value={value.id}
                        defaultChecked={initial.defaultValueId === value.id}
                        aria-label={`${value.label} por omissão`}
                        className="accent-brand size-4"
                      />
                    </td>
                    <td className="py-1">
                      {value.label}{" "}
                      <span className="text-steel font-mono text-xs">{value.key}</span>
                      {value.archived && <span className="text-error ml-2 text-xs">arquivado</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {errors.allowed && <p className="text-error text-xs">{errors.allowed}</p>}
        </fieldset>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          Guardar opção
        </Button>
        <FormStatus pending={pending} state={state} />
      </div>
    </form>
  );
}
