"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { submitKeepingValues } from "@/components/admin/submit-keeping-values";
import { Button } from "@/components/ui/button";
import { slugify } from "@/lib/slug";
import {
  archiveCategoryAction,
  type FormState,
  restoreCategoryAction,
  type RowState,
  saveCategoryAction,
} from "./actions";

const fieldClass =
  "border-line-strong focus-visible:ring-brand/40 aria-invalid:border-error rounded-[2px] border bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2";

export interface CategoryFormValues {
  name: string;
  slug: string;
  description: string;
  parentId: string;
  position: number;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-error mt-1 text-xs">
      {message}
    </p>
  );
}

export function CategoryForm({
  id,
  initial,
  parents,
}: {
  id: string | null;
  initial: CategoryFormValues;
  parents: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveCategoryAction.bind(null, id),
    null,
  );
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  // Enquanto o endereço não for mexido à mão, acompanha o nome.
  const [slugTouched, setSlugTouched] = useState(initial.slug !== "");
  const errors = state?.fieldErrors ?? {};

  return (
    <form onSubmit={submitKeepingValues(action)} className="grid max-w-xl gap-5">
      <div>
        <label htmlFor="name" className="text-sm font-medium">
          Nome
        </label>
        <input
          id="name"
          name="name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (!slugTouched) setSlug(slugify(event.target.value));
          }}
          required
          maxLength={80}
          aria-invalid={Boolean(errors.name) || undefined}
          aria-describedby="name-error"
          className={`${fieldClass} mt-1 w-full`}
        />
        <FieldError id="name-error" message={errors.name} />
      </div>

      <div>
        <label htmlFor="slug" className="text-sm font-medium">
          Endereço na loja
        </label>
        <div className="mt-1">
          <input
            id="slug"
            name="slug"
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
            required
            maxLength={80}
            aria-invalid={Boolean(errors.slug) || undefined}
            aria-describedby="slug-help slug-error"
            className={`${fieldClass} w-full`}
          />
        </div>
        <p id="slug-help" className="text-steel mt-1 text-xs">
          Parte do endereço da página (ex.: portoes-de-correr). Mudá-lo depois de publicado quebra
          os links antigos.
        </p>
        <FieldError id="slug-error" message={errors.slug} />
      </div>

      <div>
        <label htmlFor="parentId" className="text-sm font-medium">
          Dentro de
        </label>
        <select
          id="parentId"
          name="parentId"
          defaultValue={initial.parentId}
          aria-invalid={Boolean(errors.parentId) || undefined}
          aria-describedby="parentId-error"
          className={`${fieldClass} mt-1 w-full`}
        >
          <option value="">Nenhuma (categoria de topo)</option>
          {parents.map((parent) => (
            <option key={parent.id} value={parent.id}>
              {parent.name}
            </option>
          ))}
        </select>
        <FieldError id="parentId-error" message={errors.parentId} />
      </div>

      <div>
        <label htmlFor="description" className="text-sm font-medium">
          Descrição <span className="text-steel font-normal">(opcional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={initial.description}
          rows={4}
          maxLength={2000}
          className={`${fieldClass} mt-1 w-full`}
        />
        <FieldError id="description-error" message={errors.description} />
      </div>

      <div>
        <label htmlFor="position" className="text-sm font-medium">
          Ordem
        </label>
        <input
          id="position"
          name="position"
          type="number"
          min={0}
          max={9999}
          defaultValue={initial.position}
          aria-describedby="position-help position-error"
          className={`${fieldClass} mt-1 w-28`}
        />
        <p id="position-help" className="text-steel mt-1 text-xs">
          Números mais baixos aparecem primeiro.
        </p>
        <FieldError id="position-error" message={errors.position} />
      </div>

      {state?.message && (
        <p role="alert" className="text-error text-sm">
          {state.message}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "A guardar…" : id ? "Guardar alterações" : "Criar categoria"}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/admin/categorias">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}

export function RowAction({
  id,
  kind,
  label,
}: {
  id: string;
  kind: "archive" | "restore";
  label: string;
}) {
  const [state, action, pending] = useActionState<RowState>(
    (kind === "archive" ? archiveCategoryAction : restoreCategoryAction).bind(null, id),
    null,
  );
  return (
    <form onSubmit={submitKeepingValues(action)} className="flex items-center gap-2">
      <Button type="submit" size="sm" variant="ghost" disabled={pending}>
        {label}
      </Button>
      {state && !state.ok && (
        <span role="status" className="text-error text-xs">
          {state.message}
        </span>
      )}
    </form>
  );
}
