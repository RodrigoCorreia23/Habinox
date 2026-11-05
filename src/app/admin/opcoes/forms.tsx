"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { cn } from "cn";
import { ChevronRight, Plus, XIcon } from "lucide-react";
import { Advanced } from "@/components/admin/help";
import { AutoKeyField } from "@/components/admin/auto-key-field";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Field, fieldClass, Select, textareaClass } from "@/components/admin/field";
import { Notice } from "@/components/admin/notice";
import { ReorderButtons } from "@/components/admin/reorder-buttons";
import { SaveBar } from "@/components/admin/save-bar";
import { SearchSelect, type SearchSelectOption } from "@/components/admin/search-select";
import { submitKeepingValues } from "@/components/admin/submit-keeping-values";
import { useToast } from "@/components/admin/toaster";
import { useDirtyForm } from "@/components/admin/use-dirty-form";
import { Button } from "@/components/ui/button";
import { keyFromName } from "@/lib/options";
import {
  archiveOptionAction,
  archiveValueAction,
  createOptionAction,
  type FormState,
  moveValueAction,
  saveValueAction,
  updateOptionAction,
} from "./actions";

// ── Tipos de opção ──────────────────────────────────────────────────────────

const TYPE_INFO: Record<string, { label: string; example: string; detail: string }> = {
  dimension: {
    label: "Medida",
    example: "Largura do portão, altura da guarda",
    detail: "O cliente escreve um valor em mm, cm ou m. Na fórmula entra em metros.",
  },
  number: {
    label: "Número",
    example: "N.º de degraus, n.º de varões",
    detail: "Um número sem unidade que o cliente escreve.",
  },
  choice: {
    label: "Escolha",
    example: "Material: Ferro lacado, Inox ou Alumínio",
    detail: "O cliente escolhe um de vários valores, que acrescenta a seguir.",
  },
  boolean: {
    label: "Sim / não",
    example: "Fechadura elétrica, iluminação",
    detail: "O cliente marca ou não. Na fórmula vale 1 ou 0.",
  },
};

const DISPLAY_LABELS = { pills: "Botões", list: "Lista", swatches: "Amostras de cor" };

/** Depois de um envio com erros, o foco vai para o primeiro campo com problema. */
function useFocusFirstError(form: React.RefObject<HTMLFormElement | null>, state: FormState) {
  useEffect(() => {
    if (!state?.fieldErrors) return;
    form.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [form, state]);
}

export interface OptionFormValues {
  name: string;
  key: string;
  type: string;
  unit: string;
  display: string;
  helpText: string;
}

function PresentationFields({
  type,
  initial,
  errors,
}: {
  type: string;
  initial: OptionFormValues;
  errors: Record<string, string>;
}) {
  return (
    <>
      {type === "dimension" && (
        <Field
          label="Unidade que o cliente vê"
          error={errors.unit}
          hint="Guarda-se sempre em mm; isto muda só o que o cliente vê e escreve."
          className="max-w-xs"
        >
          <Select name="unit" defaultValue={initial.unit || "mm"}>
            <option value="mm">mm</option>
            <option value="cm">cm</option>
            <option value="m">m</option>
          </Select>
        </Field>
      )}
      {type === "choice" && (
        <Field
          label="Como aparece na loja"
          error={errors.display}
          hint="Amostras de cor mostram um quadrado com a cor de cada valor."
          className="max-w-xs"
        >
          <Select name="display" defaultValue={initial.display || "pills"}>
            {Object.entries(DISPLAY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field
        label="Ajuda para o cliente"
        optional
        error={errors.helpText}
        hint="Uma frase por baixo da pergunta na loja (ex.: «Meça entre os pilares»)."
      >
        <textarea
          name="helpText"
          defaultValue={initial.helpText}
          rows={2}
          maxLength={500}
          className={textareaClass}
        />
      </Field>
    </>
  );
}

/** Resultado de um envio de «Nova opção», com a chave enviada (ver NewOptionForm). */
type KeySubmission = {
  state: FormState;
  key: string;
  attempt: number;
  keyErrorSeen: boolean;
} | null;

/** Criar uma opção: nome, tipo (em cartões, não muda depois) e apresentação. */
export function NewOptionForm({
  initial,
  productId,
}: {
  initial: OptionFormValues;
  /** Criada a partir do editor de um produto: acrescenta-se a esse produto. */
  productId?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState(initial.type);
  // Guarda também a chave enviada e o n.º da tentativa: com um erro na chave, o campo
  // volta a montar já aberto para editar (com o que foi enviado) e o Avançado abre.
  const [submission, action, pending] = useActionState<KeySubmission, FormData>(
    async (previous, formData) => {
      const result = await createOptionAction(previous?.state ?? null, formData);
      return {
        state: result,
        key: String(formData.get("key") ?? ""),
        attempt: (previous?.attempt ?? 0) + 1,
        keyErrorSeen: Boolean(previous?.keyErrorSeen || result?.fieldErrors?.key),
      };
    },
    null,
  );
  const state = submission?.state ?? null;
  const errors = state?.fieldErrors ?? {};
  useFocusFirstError(formRef, state);

  return (
    <form ref={formRef} onSubmit={submitKeepingValues(action)} className="grid gap-6">
      {productId && <input type="hidden" name="productId" value={productId} />}
      {state?.message && !state.ok && <Notice tone="danger">{state.message}</Notice>}
      <Field label="Nome que o cliente vê" error={errors.name}>
        <input
          name="name"
          defaultValue={initial.name}
          required
          maxLength={80}
          autoComplete="off"
          placeholder="Ex.: Largura, Material, Motorização"
          className={fieldClass}
        />
      </Field>

      <fieldset className="grid gap-3">
        <legend className="text-ink mb-1.5 text-sm font-medium">Tipo</legend>
        <p className="text-steel -mt-1 text-[13px]/[18px]">
          Escolha com cuidado: o tipo{" "}
          <strong className="text-ink font-medium">não se pode mudar depois</strong> de criada,
          porque as fórmulas e os orçamentos dependem dele.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(TYPE_INFO).map(([value, info]) => (
            <label
              key={value}
              className={cn(
                "bg-surface border-line hover:border-line-strong relative grid cursor-pointer gap-1 rounded-[2px] border p-4 pl-11 transition-colors duration-150",
                "has-[:checked]:border-ink has-[:checked]:ring-ink has-[:checked]:ring-1",
                "has-[:focus-visible]:ring-amber-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2",
              )}
            >
              <input
                type="radio"
                name="type"
                value={value}
                checked={type === value}
                onChange={() => setType(value)}
                className="absolute top-[1.1rem] left-4 size-4"
              />
              <span className="text-ink text-[15px]/[22px] font-semibold">{info.label}</span>
              <span className="text-ink-soft text-sm">{info.example}</span>
              <span className="text-steel text-[13px]/[18px]">{info.detail}</span>
            </label>
          ))}
        </div>
        {errors.type && <p className="text-danger text-[13px]">{errors.type}</p>}
      </fieldset>

      <PresentationFields type={type} initial={initial} errors={errors} />

      <Advanced open={submission?.keyErrorSeen ? true : undefined}>
        <AutoKeyField
          key={errors.key ? `chave-erro-${submission?.attempt}` : "chave"}
          name="key"
          followName="name"
          kind="key"
          defaultValue={submission?.key ?? initial.key}
          error={errors.key}
        />
        <p className="text-steel mt-2 text-[13px]/[18px]">
          É gerado a partir do nome e é o que as fórmulas de preço usam (ex.: material.espessura).
          Depois de criada, não muda.
        </p>
      </Advanced>

      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" pending={pending} pendingLabel="A criar…">
            Criar opção
          </Button>
          <Button asChild variant="ghost">
            <Link href={productId ? `/admin/produtos/${productId}#opcoes` : "/admin/opcoes"}>
              Cancelar
            </Link>
          </Button>
        </div>
        <p className="text-steel text-[13px]/[18px]">
          {type === "choice"
            ? `Seguinte: acrescentar os valores (ex.: Ferro lacado, Inox, Alumínio)${productId ? " e juntá-la ao produto" : ""}.`
            : productId
              ? "Fica logo no produto; depois acerte lá os limites."
              : "Seguinte: acrescentá-la aos produtos que a usam, com os limites de cada um."}
        </p>
      </div>
    </form>
  );
}

/** Lugar da barra «Tem alterações por guardar»: no fim da página (filho direto do main). */
const SAVE_BAR_SLOT = "barra-guardar";

/**
 * Dados de uma opção existente: guardam com a barra de baixo, sem sair da página.
 * A barra vai para o fim da página (SAVE_BAR_SLOT), para ficar presa ao fundo do
 * ecrã enquanto se mexe nos valores mais abaixo.
 */
export function OptionEditor({ id, initial }: { id: string; initial: OptionFormValues }) {
  const formId = "opcao-dados";
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();
  const { dirty, formProps, markClean } = useDirtyForm();
  const [state, action, pending] = useActionState<FormState, FormData>(
    async (previous, formData) => {
      const result = await updateOptionAction(id, previous, formData);
      if (result?.ok) {
        markClean();
        toast({ tone: "ok", message: "Guardado." });
      }
      return result;
    },
    null,
  );
  const errors = state?.fieldErrors ?? {};
  useFocusFirstError(formRef, state);
  const info = TYPE_INFO[initial.type];

  return (
    <>
      <form
        ref={formRef}
        id={formId}
        onSubmit={submitKeepingValues(action)}
        {...formProps}
        className="bg-surface border-line grid gap-5 rounded-[2px] border p-5"
      >
        {state?.message && !state.ok && <Notice tone="danger">{state.message}</Notice>}
        <Field label="Nome que o cliente vê" error={errors.name}>
          <input
            name="name"
            defaultValue={initial.name}
            required
            maxLength={80}
            autoComplete="off"
            className={fieldClass}
          />
        </Field>

        <div className="grid gap-1 text-sm">
          <span className="text-ink font-medium">Tipo</span>
          <input type="hidden" name="type" value={initial.type} />
          <p className="text-ink">
            {info?.label ?? initial.type}
            <span className="text-steel"> · {info?.detail}</span>
          </p>
          <p className="text-steel text-[13px]/[18px]">
            Não se pode mudar: as fórmulas e os orçamentos dependem dele.
          </p>
        </div>

        <PresentationFields type={initial.type} initial={initial} errors={errors} />

        <Advanced>
          <AutoKeyField
            name="key"
            followName="name"
            kind="key"
            defaultValue={initial.key}
            locked
            lockedReason="Não muda: as fórmulas e os orçamentos usam-no."
          />
        </Advanced>
      </form>
      {/* Só há barra depois de mexer no formulário (já no browser): o document existe. */}
      {(dirty || pending) &&
        createPortal(
          <SaveBar formId={formId} dirty={dirty} pending={pending} />,
          document.getElementById(SAVE_BAR_SLOT) ?? document.body,
        )}
    </>
  );
}

/** Zona de perigo da opção: arquivar (com o efeito dito antes) ou repor. */
export function OptionArchiveZone({
  id,
  name,
  archived,
  usedIn,
}: {
  id: string;
  name: string;
  archived: boolean;
  usedIn: string[];
}) {
  const [pending, startTransition] = useTransition();
  const run = (archive: boolean) =>
    startTransition(async () => {
      // A mensagem chega num toast (setFlash) quando a página se atualiza.
      await archiveOptionAction(id, archive);
    });

  if (archived) {
    return (
      <Button
        type="button"
        variant="outline"
        pending={pending}
        pendingLabel="A repor…"
        onClick={() => run(false)}
      >
        Repor opção
      </Button>
    );
  }
  const consequence =
    usedIn.length > 0
      ? `${usedIn.length === 1 ? `${usedIn[0]} usa-a` : `${usedIn.length} produtos usam-na (${usedIn.slice(0, 3).join(", ")}${usedIn.length > 3 ? "…" : ""})`} e continua${usedIn.length === 1 ? "" : "m"} igual${usedIn.length === 1 ? "" : "is"} na loja. Deixa de se poder acrescentar a outros produtos.`
      : "Nenhum produto a usa. Deixa de se poder acrescentar a produtos; pode repô-la quando quiser.";
  return (
    <ConfirmButton
      type="button"
      size="default"
      label="Arquivar opção"
      question={`Arquivar «${name}»?`}
      consequence={consequence}
      confirmLabel="Arquivar"
      pending={pending}
      onConfirm={() => run(true)}
    />
  );
}

// ── Números para as contas ──────────────────────────────────────────────────

interface ParamRow {
  id: number;
  name: string;
  /**
   * A chave gravada (ex.: «espessura»). Vazia nas linhas novas, que a tiram do nome.
   * Nas linhas já gravadas nunca muda sozinha: as fórmulas dos produtos leem-na.
   */
  key: string;
  value: string;
  /** Linha já gravada a quem o Bruno pediu para mudar o nome (e, com ele, a chave). */
  renaming: boolean;
}

/** «espessura_chapa» → «Espessura chapa»: o nome do número como texto corrente. */
function humanizeKey(key: string) {
  const text = key.replace(/^v_(?=\d)/, "").replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const formatNumber = (value: number) => String(value).replace(".", ",");
const NUMBER = /^-?\d+(?:[.,]\d+)?$/;

/**
 * Pares «Nome do número» + «Valor» que as fórmulas leem como opção.nome
 * (ex.: material.espessura). Serializa para o formato de sempre num campo escondido.
 * Os números já gravados mostram o nome só para leitura: mudá-lo muda o nome na
 * fórmula, por isso fica atrás de «Mudar nome», com o aviso do que se estraga.
 */
function ParamsEditor({
  optionKey,
  initial,
  error,
}: {
  optionKey: string;
  initial: Record<string, number>;
  error?: string;
}) {
  const [rows, setRows] = useState<ParamRow[]>(() =>
    Object.entries(initial).map(([key, value], index) => ({
      id: index,
      name: humanizeKey(key),
      key,
      value: formatNumber(value),
      renaming: false,
    })),
  );
  const nextId = useRef(Object.keys(initial).length);
  const baseId = useId();
  // Linhas novas e linhas a mudar de nome tiram a chave do nome; as outras guardam a sua.
  const keyOf = (row: ParamRow) => (row.key && !row.renaming ? row.key : keyFromName(row.name));
  const problemOf = (row: ParamRow) => {
    if (row.name.trim() === "" && row.value.trim() === "") return null;
    if (row.name.trim() === "") return "Dê um nome ao número.";
    if (!NUMBER.test(row.value.trim())) return "Escreva um número (ex.: 1,5).";
    return null;
  };
  const serialized = rows
    .filter((row) => row.name.trim() !== "" || row.value.trim() !== "")
    .map((row) => `${keyOf(row)}=${row.value.trim()}`)
    .join("; ");
  const update = (id: number, patch: Partial<ParamRow>) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  return (
    <fieldset className="grid gap-2">
      <legend className="text-ink mb-1.5 flex w-full items-baseline justify-between gap-3 text-sm font-medium">
        Números para as contas
        <span className="text-steel-light text-[13px] font-normal">opcional</span>
      </legend>
      <p className="text-steel text-[13px]/[18px]">
        Valores que as fórmulas de preço usam quando o cliente escolhe este valor. Ex.: Espessura da
        chapa = 1,5 → na fórmula: <code className="font-mono">{optionKey}.espessura_da_chapa</code>
      </p>
      <input type="hidden" name="params" value={serialized} />
      {rows.length > 0 && (
        <ul className="grid gap-3">
          {rows.map((row) => {
            const problem = problemOf(row);
            const rowId = `${baseId}-${row.id}`;
            const saved = row.key !== "";
            const nameEditable = !saved || row.renaming;
            const oldVariable = `${optionKey}.${row.key}`;
            const newVariable = `${optionKey}.${keyOf(row)}`;
            const keyChanged = saved && row.renaming && keyOf(row) !== row.key;
            return (
              <li key={row.id} className="grid gap-1">
                <div className="flex items-start gap-2">
                  {nameEditable ? (
                    <label className="grid min-w-0 flex-1 gap-1">
                      <span className="sr-only">Nome do número</span>
                      <input
                        value={row.name}
                        onChange={(event) => update(row.id, { name: event.target.value })}
                        placeholder="Nome do número (ex.: Espessura)"
                        maxLength={40}
                        autoComplete="off"
                        autoFocus={row.renaming}
                        aria-invalid={problem && row.name.trim() === "" ? true : undefined}
                        aria-describedby={
                          [problem && `${rowId}-erro`, keyChanged && `${rowId}-aviso`]
                            .filter(Boolean)
                            .join(" ") || undefined
                        }
                        className={cn(fieldClass, "w-full")}
                      />
                    </label>
                  ) : (
                    <div className="flex min-h-10 min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 pointer-coarse:min-h-11">
                      <span className="text-ink min-w-0 truncate text-sm font-medium">
                        {row.name}
                      </span>
                      <Button
                        type="button"
                        variant="link"
                        className="text-[13px]"
                        aria-label={`Mudar o nome de ${row.name}`}
                        onClick={() => update(row.id, { renaming: true })}
                      >
                        Mudar nome
                      </Button>
                    </div>
                  )}
                  <label className="grid w-28 shrink-0 gap-1">
                    <span className="sr-only">Valor de {row.name || "número novo"}</span>
                    <input
                      value={row.value}
                      onChange={(event) => update(row.id, { value: event.target.value })}
                      placeholder="Valor"
                      inputMode="decimal"
                      autoComplete="off"
                      aria-invalid={problem && row.name.trim() !== "" ? true : undefined}
                      aria-describedby={problem ? `${rowId}-erro` : undefined}
                      className={cn(fieldClass, "w-full text-right tabular-nums")}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover ${row.name || "número"}`}
                    onClick={() =>
                      setRows((current) => current.filter((candidate) => candidate.id !== row.id))
                    }
                  >
                    <XIcon strokeWidth={1.75} />
                  </Button>
                </div>
                {problem ? (
                  <p id={`${rowId}-erro`} className="text-danger text-[13px]">
                    {problem}
                  </p>
                ) : (
                  row.name.trim() !== "" &&
                  !keyChanged && (
                    <p className="text-steel text-[13px]">
                      Na fórmula: <code className="font-mono">{newVariable}</code>
                    </p>
                  )
                )}
                {row.renaming && (
                  <div
                    id={`${rowId}-aviso`}
                    className="text-ink-soft flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px]/[18px]"
                  >
                    <span>
                      {keyChanged ? (
                        <>
                          <strong className="text-danger font-medium">Atenção:</strong> as fórmulas
                          que usam <code className="font-mono">{oldVariable}</code> deixam de
                          funcionar até as mudar para{" "}
                          <code className="font-mono">{newVariable}</code>.
                        </>
                      ) : (
                        <>
                          Mudar o nome muda também o nome na fórmula: as fórmulas que usam{" "}
                          <code className="font-mono">{oldVariable}</code> deixam de funcionar.
                        </>
                      )}
                    </span>
                    <Button
                      type="button"
                      variant="link"
                      className="text-[13px]"
                      onClick={() =>
                        update(row.id, { renaming: false, name: humanizeKey(row.key) })
                      }
                    >
                      Manter o nome
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setRows((current) => [
              ...current,
              { id: nextId.current++, name: "", key: "", value: "", renaming: false },
            ])
          }
        >
          <Plus aria-hidden strokeWidth={1.75} />
          Acrescentar número
        </Button>
      </div>
      {error && <p className="text-danger text-[13px]">{error}</p>}
    </fieldset>
  );
}

// ── Valores de uma opção de escolha ─────────────────────────────────────────

export interface ValueItem {
  id: string;
  label: string;
  key: string;
  position: number;
  params: Record<string, number>;
  ralCode: string;
  swatchHex: string;
  materialId: string;
  materialName: string | null;
  asksText: boolean;
  /** Produtos que oferecem este valor. */
  usedIn: string[];
}

function ValueEditForm({
  optionId,
  optionKey,
  value,
  swatches,
  materials,
  onSaved,
  onDirty,
}: {
  optionId: string;
  optionKey: string;
  value: ValueItem;
  swatches: boolean;
  materials: SearchSelectOption[];
  onSaved: () => void;
  onDirty: (dirty: boolean) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();
  const { dirty, formProps, markClean } = useDirtyForm();
  const [state, action, pending] = useActionState<FormState, FormData>(
    async (previous, formData) => {
      const result = await saveValueAction(optionId, value.id, previous, formData);
      if (result?.ok) {
        markClean();
        toast({ tone: "ok", message: `«${String(formData.get("label"))}» guardado.` });
        onSaved();
      }
      return result;
    },
    null,
  );
  const errors = state?.fieldErrors ?? {};
  useFocusFirstError(formRef, state);
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  const formId = `valor-${value.id}`;

  return (
    <form
      ref={formRef}
      id={formId}
      onSubmit={submitKeepingValues(action)}
      {...formProps}
      className="grid gap-5"
    >
      {state?.message && !state.ok && <Notice tone="danger">{state.message}</Notice>}
      <input type="hidden" name="position" value={value.position} />
      <div className="grid gap-5">
        <Field label="Nome" error={errors.label}>
          <input
            name="label"
            defaultValue={value.label}
            required
            maxLength={80}
            autoComplete="off"
            className={fieldClass}
          />
        </Field>
        <div className="grid content-start gap-1.5 text-sm">
          <span
            id={`${formId}-custo`}
            className="text-ink flex items-baseline justify-between gap-3 font-medium"
          >
            Custo extra deste valor
            <span className="text-steel-light text-[13px] font-normal">opcional</span>
          </span>
          <SearchSelect
            name="materialId"
            options={materials}
            defaultValue={value.materialId}
            placeholder="Nenhum"
            emptyText="Nenhum material com esse nome."
            ariaLabel="Custo extra deste valor"
            invalid={Boolean(errors.materialId)}
            onValueChange={() => formProps.onChange()}
          />
          <span className="text-steel text-[13px]/[18px]">
            Ex.: escolher «Motorizado» soma o custo do kit de motor ao preço.
          </span>
          {errors.materialId && (
            <span className="text-danger text-[13px]/[18px]">{errors.materialId}</span>
          )}
        </div>
      </div>

      {swatches && (
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] md:max-w-md">
          <Field label="Código RAL" optional error={errors.ralCode}>
            <input
              name="ralCode"
              defaultValue={value.ralCode}
              maxLength={20}
              placeholder="Ex.: RAL 7016"
              className={fieldClass}
            />
          </Field>
          <Field label="Cor da amostra" error={errors.swatchHex}>
            <input
              name="swatchHex"
              type="color"
              defaultValue={value.swatchHex || "#808080"}
              className="border-line-strong h-10 w-20 cursor-pointer rounded-[2px] border bg-white p-1 pointer-coarse:h-11"
            />
          </Field>
        </div>
      )}

      <ParamsEditor optionKey={optionKey} initial={value.params} error={errors.params} />

      <label className="text-ink flex min-h-10 items-center gap-2 text-sm pointer-coarse:min-h-11">
        <input type="checkbox" name="asksText" defaultChecked={value.asksText} className="size-4" />
        Pedir um texto ao cliente quando escolhe este valor (ex.: «Outra cor RAL → qual?»)
      </label>

      <Advanced>
        <AutoKeyField
          name="key"
          followName="label"
          kind="key"
          defaultValue={value.key}
          locked
          lockedReason="Não muda: os orçamentos guardam-no."
        />
      </Advanced>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button type="submit" variant={dirty ? "default" : "outline"} pending={pending}>
          Guardar valor
        </Button>
      </div>
    </form>
  );
}

function ArchiveValueButton({ value }: { value: ValueItem }) {
  const [pending, startTransition] = useTransition();
  const consequence =
    value.usedIn.length > 0
      ? `${value.usedIn.length === 1 ? value.usedIn[0] : `${value.usedIn.length} produtos`} já ${value.usedIn.length === 1 ? "o oferece e continua" : "o oferecem e continuam"} igual${value.usedIn.length === 1 ? "" : "is"}. Deixa de vir na lista quando acrescentar esta opção a outro produto.`
      : "Nenhum produto o oferece. Pode repô-lo quando quiser.";
  return (
    <ConfirmButton
      type="button"
      label="Arquivar valor"
      question={`Arquivar «${value.label}»?`}
      consequence={consequence}
      confirmLabel="Arquivar"
      pending={pending}
      onConfirm={() =>
        startTransition(async () => {
          await archiveValueAction(value.id, true);
        })
      }
    />
  );
}

/**
 * Lista dos valores: cada linha abre em linha (uma de cada vez) para mudar os
 * detalhes; ↑↓ mudam a ordem; no fim, «Nome + Acrescentar».
 */
export function ValueList({
  optionId,
  optionKey,
  values,
  swatches,
  materials,
  nextPosition,
}: {
  optionId: string;
  optionKey: string;
  values: ValueItem[];
  swatches: boolean;
  materials: SearchSelectOption[];
  nextPosition: number;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [dirtyId, setDirtyId] = useState<string | null>(null);
  const toggle = (id: string) => {
    if (
      dirtyId &&
      dirtyId !== id &&
      !window.confirm("Tem alterações por guardar. Sair sem guardar?")
    ) {
      return;
    }
    setDirtyId(null);
    setOpenId((current) => (current === id ? null : id));
  };

  return (
    <div className="grid gap-4">
      {values.length > 0 && (
        <ul className="bg-surface border-line divide-line-soft divide-y rounded-[2px] border">
          {values.map((value, index) => {
            const open = openId === value.id;
            const panelId = `valor-${value.id}-detalhes`;
            const facts = [
              ...Object.entries(value.params).map(
                ([key, number]) => `${humanizeKey(key)} ${formatNumber(number)}`,
              ),
              ...(value.ralCode ? [value.ralCode] : []),
              ...(value.materialName ? [`custo extra: ${value.materialName}`] : []),
              ...(value.asksText ? ["pede texto"] : []),
            ];
            return (
              <li key={value.id} className={cn(open && "bg-surface-alt/30")}>
                <div className="flex items-center gap-2 pr-2">
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => toggle(value.id)}
                    className="hover:bg-surface-alt/60 focus-visible:ring-amber-ink flex min-h-12 min-w-0 flex-1 cursor-pointer items-center gap-3 px-4 py-3 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset"
                  >
                    <ChevronRight
                      aria-hidden
                      className={cn(
                        "text-steel size-4 shrink-0 transition-transform duration-150",
                        open && "rotate-90",
                      )}
                      strokeWidth={1.75}
                    />
                    {value.swatchHex && (
                      <span
                        aria-hidden
                        className="border-line size-5 shrink-0 rounded-[2px] border"
                        style={{ backgroundColor: value.swatchHex }}
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="text-ink flex flex-wrap items-center gap-x-2 font-medium">
                        {value.label}
                        {dirtyId === value.id && (
                          <span className="text-steel inline-flex items-center gap-1.5 text-[13px] font-normal">
                            <span aria-hidden className="bg-amber size-1.5 rounded-full" />
                            por guardar
                          </span>
                        )}
                      </span>
                      {facts.length > 0 && (
                        <span className="text-steel block truncate text-[13px]">
                          {facts.join(" · ")}
                        </span>
                      )}
                    </span>
                    <span className="text-steel hidden shrink-0 text-[13px] sm:inline">
                      {value.usedIn.length === 0
                        ? "Em nenhum produto"
                        : `Em ${value.usedIn.length} ${value.usedIn.length === 1 ? "produto" : "produtos"}`}
                    </span>
                  </button>
                  <ReorderButtons
                    itemLabel={value.label}
                    upAction={index > 0 ? moveValueAction.bind(null, value.id, "up") : undefined}
                    downAction={
                      index < values.length - 1
                        ? moveValueAction.bind(null, value.id, "down")
                        : undefined
                    }
                  />
                </div>
                {open && (
                  <div
                    id={panelId}
                    className="border-line-soft grid gap-6 border-t px-4 py-5 md:pl-11"
                  >
                    <ValueEditForm
                      optionId={optionId}
                      optionKey={optionKey}
                      value={value}
                      swatches={swatches}
                      materials={materials}
                      onSaved={() => {
                        setDirtyId(null);
                        setOpenId(null);
                      }}
                      onDirty={(dirty) =>
                        setDirtyId((current) =>
                          dirty ? value.id : current === value.id ? null : current,
                        )
                      }
                    />
                    <div className="border-line-soft border-t pt-4">
                      <ArchiveValueButton value={value} />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <NewValueRow
        optionId={optionId}
        nextPosition={nextPosition}
        onCreated={(id) => {
          setDirtyId(null);
          setOpenId(id);
        }}
      />
    </div>
  );
}

/** «Nome + Acrescentar»: o valor novo abre logo para os detalhes opcionais. */
function NewValueRow({
  optionId,
  nextPosition,
  onCreated,
}: {
  optionId: string;
  nextPosition: number;
  onCreated: (id: string) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState("");
  const { toast } = useToast();
  const [state, action, pending] = useActionState<FormState, FormData>(
    async (previous, formData) => {
      const result = await saveValueAction(optionId, null, previous, formData);
      if (result?.ok) {
        toast({ tone: "ok", message: `«${String(formData.get("label"))}» acrescentado.` });
        setLabel("");
        if (result.id) onCreated(result.id);
      }
      return result;
    },
    null,
  );
  const error = state?.ok
    ? undefined
    : (state?.fieldErrors?.label ?? state?.fieldErrors?.key ?? state?.message);

  return (
    <form
      ref={formRef}
      id="novo-valor"
      onSubmit={submitKeepingValues(action)}
      className="bg-surface border-line grid scroll-mt-24 gap-1.5 rounded-[2px] border p-4"
    >
      <label htmlFor="novo-valor-nome" className="text-ink text-sm font-medium">
        Novo valor
      </label>
      <input type="hidden" name="key" value={keyFromName(label)} />
      <input type="hidden" name="position" value={nextPosition} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={inputRef}
          id="novo-valor-nome"
          name="label"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          required
          maxLength={80}
          autoComplete="off"
          placeholder="Ex.: Inox escovado"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "novo-valor-erro" : "novo-valor-ajuda"}
          className={cn(fieldClass, "w-full min-w-0 sm:flex-1")}
        />
        <Button type="submit" variant="outline" pending={pending} pendingLabel="A acrescentar…">
          <Plus aria-hidden strokeWidth={1.75} />
          Acrescentar
        </Button>
      </div>
      {error ? (
        <p id="novo-valor-erro" className="text-danger text-[13px]">
          {error}
        </p>
      ) : (
        <p id="novo-valor-ajuda" className="text-steel text-[13px]/[18px]">
          Depois de acrescentar, o valor abre para os detalhes opcionais (custo extra, cor, números
          para as contas).
        </p>
      )}
    </form>
  );
}

/** «Repor» de um valor arquivado. */
export function RestoreValueButton({ id, label }: { id: string; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      pending={pending}
      pendingLabel="A repor…"
      aria-label={`Repor ${label}`}
      onClick={() =>
        startTransition(async () => {
          await archiveValueAction(id, false);
        })
      }
    >
      Repor
    </Button>
  );
}

/** «Repor» de uma opção arquivada, na lista. */
export function RestoreOptionButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      pending={pending}
      pendingLabel="A repor…"
      aria-label={`Repor ${name}`}
      onClick={() =>
        startTransition(async () => {
          await archiveOptionAction(id, false);
        })
      }
    >
      Repor
    </Button>
  );
}
