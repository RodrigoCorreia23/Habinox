"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { AutoKeyField } from "@/components/admin/auto-key-field";
import { Field, fieldClass, Select, textareaClass } from "@/components/admin/field";
import { Notice } from "@/components/admin/notice";
import { RowMenu, RowMenuItem } from "@/components/admin/row-menu";
import { SaveBar } from "@/components/admin/save-bar";
import { submitKeepingValues } from "@/components/admin/submit-keeping-values";
import { useToast } from "@/components/admin/toaster";
import { useDirtyForm } from "@/components/admin/use-dirty-form";
import { Button } from "@/components/ui/button";
import {
  archiveCategoryAction,
  type FormState,
  restoreCategoryAction,
  saveCategoryAction,
} from "./actions";

/** Início do endereço público de uma categoria (a loja vive em /pt/loja/…). */
const SLUG_PREFIX = "habinox.pt/pt/loja/";

export interface CategoryFormValues {
  name: string;
  slug: string;
  description: string;
  parentId: string;
  position: number;
}

/** Depois de um envio com erros, o foco vai para o primeiro campo com problema. */
function useFocusFirstError(form: React.RefObject<HTMLFormElement | null>, state: FormState) {
  useEffect(() => {
    if (!state?.fieldErrors) return;
    form.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [form, state]);
}

function CategoryFields({
  formId,
  initial,
  parents,
  errors,
  submittedSlug,
  attempt = 0,
}: {
  formId: string;
  initial: CategoryFormValues;
  parents: { id: string; name: string }[];
  errors: NonNullable<FormState>["fieldErrors"];
  /** O endereço do último envio, para o campo voltar a abrir com ele quando há erro. */
  submittedSlug?: string;
  /** N.º do envio: cada erro novo no endereço volta a montar o campo já aberto. */
  attempt?: number;
}) {
  return (
    <div className="grid gap-5">
      <Field label="Nome" error={errors?.name}>
        <input
          id={`${formId}-name`}
          name="name"
          defaultValue={initial.name}
          required
          maxLength={80}
          autoComplete="off"
          placeholder="Ex.: Portões de correr"
          className={fieldClass}
        />
      </Field>

      <AutoKeyField
        key={errors?.slug ? `endereco-erro-${attempt}` : "endereco"}
        name="slug"
        followName="name"
        kind="slug"
        label="Endereço na loja"
        prefix={SLUG_PREFIX}
        defaultValue={submittedSlug ?? initial.slug}
        error={errors?.slug}
      />

      <Field
        label="Dentro de"
        error={errors?.parentId}
        hint="Uma subcategoria aparece na loja dentro da categoria de cima."
      >
        <Select id={`${formId}-parentId`} name="parentId" defaultValue={initial.parentId}>
          <option value="">Nenhuma: é uma categoria principal</option>
          {parents.map((parent) => (
            <option key={parent.id} value={parent.id}>
              {parent.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Descrição"
        optional
        error={errors?.description}
        hint="Aparece no topo da página da categoria, por baixo do nome."
      >
        <textarea
          id={`${formId}-description`}
          name="description"
          defaultValue={initial.description}
          rows={4}
          maxLength={2000}
          className={textareaClass}
        />
      </Field>
    </div>
  );
}

/** Criar uma categoria: no fim abre a ficha dela, para pôr a imagem. */
export function NewCategoryForm({
  initial,
  parents,
}: {
  initial: CategoryFormValues;
  parents: { id: string; name: string }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  // Guarda também o endereço enviado e o n.º da tentativa: com um erro no endereço
  // (ex.: já existe), o campo volta a montar aberto para editar, com o erro por baixo.
  const [submission, action, pending] = useActionState<
    { state: FormState; slug: string; attempt: number } | null,
    FormData
  >(async (previous, formData) => {
    const result = await saveCategoryAction(null, previous?.state ?? null, formData);
    return {
      state: result,
      slug: String(formData.get("slug") ?? ""),
      attempt: (previous?.attempt ?? 0) + 1,
    };
  }, null);
  const state = submission?.state ?? null;
  useFocusFirstError(formRef, state);

  return (
    <form
      ref={formRef}
      id="categoria-nova"
      onSubmit={submitKeepingValues(action)}
      className="grid gap-6"
    >
      {state?.message && !state.ok && <Notice tone="danger">{state.message}</Notice>}
      <CategoryFields
        formId="categoria-nova"
        initial={initial}
        parents={parents}
        errors={state?.fieldErrors}
        submittedSlug={submission?.slug}
        attempt={submission?.attempt}
      />
      <p className="text-steel text-[13px]/[18px]">
        Depois de criar, acrescenta a imagem. A categoria só aparece na loja quando tiver produtos
        publicados.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" pending={pending} pendingLabel="A criar…">
          Criar categoria
        </Button>
        <Button asChild variant="ghost">
          <Link href="/admin/categorias">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}

/**
 * Ficha de uma categoria: os dados à esquerda (guardam com a barra de baixo, sem
 * sair da página) e a imagem à direita (com os seus próprios botões).
 */
export function CategoryEditor({
  id,
  initial,
  parents,
  image,
}: {
  id: string;
  initial: CategoryFormValues;
  parents: { id: string; name: string }[];
  image: React.ReactNode;
}) {
  const formId = "categoria-dados";
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();
  const { dirty, formProps, markClean } = useDirtyForm();
  // Ao descartar, os campos voltam aos valores guardados (incluindo o endereço).
  const [resetKey, setResetKey] = useState(0);
  const [state, action, pending] = useActionState<FormState, FormData>(
    async (previous, formData) => {
      const result = await saveCategoryAction(id, previous, formData);
      if (result?.ok) {
        markClean();
        toast({ tone: "ok", message: result.message ?? "Guardado." });
      }
      return result;
    },
    null,
  );
  useFocusFirstError(formRef, state);

  return (
    <>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
        <section aria-labelledby="dados-titulo" className="max-w-[720px] min-w-0">
          <h2 id="dados-titulo" className="text-ink mb-3 text-lg/[26px] font-semibold">
            Dados
          </h2>
          <form
            ref={formRef}
            id={formId}
            onSubmit={submitKeepingValues(action)}
            {...formProps}
            onReset={() => {
              formProps.onReset();
              setResetKey((key) => key + 1);
            }}
            className="bg-surface border-line grid gap-5 rounded-[2px] border p-5"
          >
            {state?.message && !state.ok && <Notice tone="danger">{state.message}</Notice>}
            <input type="hidden" name="position" value={initial.position} />
            <CategoryFields
              key={resetKey}
              formId={formId}
              initial={initial}
              parents={parents}
              errors={state?.fieldErrors}
            />
          </form>
        </section>
        <section aria-labelledby="imagem-titulo" className="min-w-0">
          <h2 id="imagem-titulo" className="text-ink mb-3 text-lg/[26px] font-semibold">
            Imagem
          </h2>
          {image}
        </section>
      </div>
      <SaveBar formId={formId} dirty={dirty} pending={pending} />
    </>
  );
}

/** Ações de uma linha da lista: «+ Subcategoria» (nas de topo) e o menu com Arquivar. */
export function CategoryRowActions({
  id,
  name,
  isRoot,
}: {
  id: string;
  name: string;
  isRoot: boolean;
}) {
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  const restore = () =>
    startTransition(async () => {
      const result = await restoreCategoryAction(id);
      toast(
        result?.ok
          ? { tone: "ok", message: `«${name}» voltou à lista.` }
          : { tone: "danger", message: result?.message ?? "Não foi possível repor." },
      );
    });

  const archive = () =>
    startTransition(async () => {
      const result = await archiveCategoryAction(id);
      if (result?.ok) {
        toast({
          tone: "ok",
          message: `«${name}» arquivada. Deixou de aparecer na loja.`,
          action: { label: "Desfazer", onClick: restore },
        });
      } else {
        toast({
          tone: "danger",
          message: `Não foi possível arquivar «${name}». ${result?.message ?? ""}`.trim(),
        });
      }
    });

  return (
    <span className="inline-flex items-center gap-1">
      {isRoot && (
        <Button asChild size="sm" variant="ghost">
          <Link
            href={`/admin/categorias/nova?pai=${id}`}
            aria-label={`Nova subcategoria de ${name}`}
          >
            <Plus aria-hidden strokeWidth={1.75} />
            Subcategoria
          </Link>
        </Button>
      )}
      <RowMenu label={name}>
        <RowMenuItem href={`/admin/categorias/${id}`}>Editar</RowMenuItem>
        <RowMenuItem tone="danger" onSelect={archive}>
          Arquivar
        </RowMenuItem>
      </RowMenu>
    </span>
  );
}

/** «Repor» de uma categoria arquivada, com o resultado num toast. */
export function RestoreCategoryButton({
  id,
  name,
  variant = "outline",
}: {
  id: string;
  name: string;
  variant?: "outline" | "default";
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      pending={pending}
      pendingLabel="A repor…"
      aria-label={`Repor ${name}`}
      onClick={() =>
        startTransition(async () => {
          const result = await restoreCategoryAction(id);
          toast(
            result?.ok
              ? { tone: "ok", message: `«${name}» voltou à lista.` }
              : { tone: "danger", message: result?.message ?? "Não foi possível repor." },
          );
        })
      }
    >
      Repor
    </Button>
  );
}
