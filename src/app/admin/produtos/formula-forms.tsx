"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { cn } from "cn";
import { CircleAlert } from "lucide-react";
import { AutoKeyField } from "@/components/admin/auto-key-field";
import { ConditionsEditor, type OptionInfo } from "@/components/admin/conditions-editor";
import { Field, fieldClass, Select, UnitInput } from "@/components/admin/field";
import { Advanced } from "@/components/admin/help";
import { Notice } from "@/components/admin/notice";
import { SearchSelect, type SearchSelectOption } from "@/components/admin/search-select";
import { submitKeepingValues } from "@/components/admin/submit-keeping-values";
import { Button } from "@/components/ui/button";
import type { Condition, ProductOptionDef } from "@/lib/options";
import type { FormState } from "./actions";
import { articleHint, sectorHint } from "./hints";
import { consumablesAction, saveLineAction, saveVariableAction } from "./formula-actions";
import { ExpressionInput, type ScopeName } from "./[id]/expression-input";
import { useInlineRow, useSavedEffect } from "./[id]/inline-edit-row";

// ── Tipos partilhados com a página ──────────────────────────────────────────

export type { OptionInfo };

export interface ChoiceOptionInfo {
  id: string;
  key: string;
  name: string;
  /** materialId: o artigo do Odoo ligado ao valor (ex.: cada cor RAL), para pré-preencher. */
  values: { id: string; key: string; label: string; materialId: string | null }[];
}

export interface Sources {
  articles: {
    id: string;
    name: string;
    erpCode: string;
    unit: string;
    cost: string;
    margin: string | null;
    missing: Date | null;
  }[];
  sectors: { id: string; name: string; hourlyRateCents: number; margin: string | null }[];
}

/** O que as contas da fórmula precisam para se verificarem e calcularem no exemplo. */
export interface FormulaContext {
  names: ScopeName[];
  options: ProductOptionDef[];
  variables: { name: string; expr: string }[];
  scope: Record<string, number>;
}

function articleOptions(sources: Sources): SearchSelectOption[] {
  return sources.articles.map((article) => ({
    value: article.id,
    label: article.missing ? `${article.name} (deixou de existir no ERP)` : article.name,
    hint: articleHint(article),
  }));
}

/** Guardar fica âmbar só quando há alterações por guardar nesta linha. */
function SaveButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  const row = useInlineRow();
  return (
    <Button type="submit" variant={row?.dirty ? "default" : "outline"} pending={pending}>
      {children}
    </Button>
  );
}

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <Notice tone="danger">{message}</Notice>;
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

// ── Consumíveis ─────────────────────────────────────────────────────────────

export function ConsumablesForm({
  productId,
  versionId,
  percent,
}: {
  productId: string;
  versionId: string;
  percent: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    consumablesAction.bind(null, productId, versionId),
    null,
  );
  useSavedEffect(state, "Consumíveis guardados.");
  const error = state?.fieldErrors?.rate;
  return (
    <form onSubmit={submitKeepingValues(action)} className="grid max-w-xl gap-4">
      <Field
        label="Percentagem sobre o custo dos materiais"
        error={error}
        hint="Discos, gás, elétrodos e outros gastos que não vale a pena medir. Cada material soma a sua própria margem."
      >
        <UnitInput
          unit="%"
          name="rate"
          defaultValue={percent}
          wrapperClassName="w-32"
          aria-invalid={error ? true : undefined}
        />
      </Field>
      <FormError message={state?.ok ? undefined : state?.message} />
      <div className="flex items-center gap-3">
        <SaveButton pending={pending}>Guardar</SaveButton>
      </div>
    </form>
  );
}

// ── Contas auxiliares (variáveis) ──────────────────────────────────────────

export function VariableForm({
  productId,
  versionId,
  variableId,
  index,
  initial,
  issues,
  context,
}: {
  productId: string;
  versionId: string;
  variableId: string | null;
  /** Posição na lista (as contas só podem usar as de cima). */
  index: number;
  initial: { name: string; expr: string; label: string; showToCustomer: boolean };
  issues: string[];
  context: FormulaContext;
}) {
  const [resetKey, setResetKey] = useState(0);
  const [state, action, pending] = useActionState<FormState, FormData>(
    async (previous, formData) => {
      const result = await saveVariableAction(productId, versionId, variableId, previous, formData);
      if (variableId === null && result?.ok) setResetKey((key) => key + 1);
      return result;
    },
    null,
  );
  useSavedEffect(state, variableId ? "Conta guardada." : "Conta criada.");
  const errors = state?.fieldErrors ?? {};
  // As contas só usam as que estão por cima: as fichas mostram só essas.
  const earlier = new Set(context.variables.slice(0, index).map((variable) => variable.name));
  const names = context.names.filter(
    (entry) => entry.kind !== "variable" || earlier.has(entry.name),
  );

  return (
    <form key={resetKey} onSubmit={submitKeepingValues(action)} className="grid max-w-3xl gap-5">
      <Field
        label="Nome"
        error={errors.label}
        hint="Ex.: Número de barras. Se o mostrar ao cliente, é este o texto que ele vê."
        className="max-w-md"
      >
        <input
          name="label"
          defaultValue={initial.label}
          maxLength={80}
          placeholder="Número de barras"
          className={fieldClass}
        />
      </Field>
      <ExpressionInput
        name="expr"
        label="Conta"
        defaultValue={initial.expr}
        placeholder="ceil(L ÷ 0,12)"
        unit=""
        names={names}
        options={context.options}
        variables={context.variables}
        checkAs={{ kind: "variable", index }}
        scope={context.scope}
        error={errors.expr ?? issues[0]}
      />
      <label className="text-ink flex min-h-10 items-center gap-2 text-sm pointer-coarse:min-h-11">
        <input
          type="checkbox"
          name="showToCustomer"
          defaultChecked={initial.showToCustomer}
          className="size-4"
        />
        Mostrar ao cliente na página do produto
      </label>
      <Advanced open={Boolean(errors.name) || undefined}>
        <AutoKeyField
          name="name"
          followName="label"
          kind="key"
          defaultValue={initial.name}
          error={errors.name}
        />
      </Advanced>
      <InlineError message={errors.name ? `Nome usado nas fórmulas: ${errors.name}` : undefined} />
      <FormError message={state?.ok ? undefined : state?.message} />
      <div className="flex items-center gap-3">
        <SaveButton pending={pending}>{variableId ? "Guardar conta" : "Criar conta"}</SaveButton>
      </div>
    </form>
  );
}

// ── Linhas de custo ─────────────────────────────────────────────────────────

export interface LineValues {
  label: string;
  kind: "material" | "labour" | "external" | "component";
  quantityExpr: string;
  unit: string;
  conditions: Condition[];
  source: "fixed" | "byOption";
  sectorId: string;
  materialId: string;
  articleOptionId: string;
  mapping: { optionValueId: string; materialId: string }[];
}

const KINDS: { value: LineValues["kind"]; label: string; hint: string }[] = [
  {
    value: "material",
    label: "Material",
    hint: "Chapa, tubo, perfil… comprado ao metro, m² ou unidade.",
  },
  { value: "labour", label: "Mão de obra", hint: "Horas de uma secção da oficina." },
  { value: "external", label: "Serviço externo", hint: "Lacagem, galvanização… feito fora." },
  { value: "component", label: "Componente", hint: "Motor, fechadura… peça comprada pronta." },
];

export function LineForm({
  productId,
  versionId,
  lineId,
  initial,
  options,
  choiceOptions,
  sources,
  issues,
  context,
}: {
  productId: string;
  versionId: string;
  lineId: string | null;
  initial: LineValues;
  options: OptionInfo[];
  choiceOptions: ChoiceOptionInfo[];
  sources: Sources;
  issues: string[];
  context: FormulaContext;
}) {
  const [kind, setKind] = useState(initial.kind);
  const [source, setSource] = useState(initial.source);
  const [materialId, setMaterialId] = useState(initial.materialId);
  const [sectorId, setSectorId] = useState(initial.sectorId);
  const [articleOptionId, setArticleOptionId] = useState(initial.articleOptionId);
  const [mapping, setMapping] = useState(initial.mapping);
  const [unit, setUnit] = useState(initial.unit);
  const [resetKey, setResetKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<FormState, FormData>(
    async (previous, formData) => {
      const result = await saveLineAction(productId, versionId, lineId, previous, formData);
      if (lineId === null && result?.ok) {
        formRef.current?.reset();
        setKind("material");
        setSource("fixed");
        setMaterialId("");
        setSectorId("");
        setArticleOptionId("");
        setMapping([]);
        setUnit("");
        setResetKey((key) => key + 1);
      }
      return result;
    },
    null,
  );
  useSavedEffect(state, lineId ? "Linha guardada." : "Linha acrescentada.");
  const errors = state?.fieldErrors ?? {};
  const byOption = choiceOptions.find((option) => option.id === articleOptionId);
  const labour = kind === "labour";
  const material = sources.articles.find((article) => article.id === materialId);
  const sector = sources.sectors.find((candidate) => candidate.id === sectorId);
  const marginMissing = labour
    ? sector && sector.margin === null
      ? [sector.name]
      : []
    : source === "fixed"
      ? material && material.margin === null
        ? [material.name]
        : []
      : sources.articles
          .filter(
            (article) =>
              article.margin === null && mapping.some((row) => row.materialId === article.id),
          )
          .map((article) => article.name);
  const articles = articleOptions(sources);
  const uid = lineId ?? `nova-${resetKey}`;

  return (
    <form ref={formRef} onSubmit={submitKeepingValues(action)} className="grid max-w-3xl gap-6">
      <Field label="Nome da linha" error={errors.label} className="max-w-md">
        <input
          key={`label-${resetKey}`}
          name="label"
          defaultValue={initial.label}
          required
          maxLength={80}
          placeholder="Tubo do quadro"
          className={fieldClass}
        />
      </Field>

      <fieldset className="grid gap-2">
        <legend className="text-ink mb-1.5 text-sm font-medium">O que é</legend>
        <input type="hidden" name="kind" value={kind} />
        <div className="border-line-strong grid grid-cols-2 overflow-hidden rounded-[2px] border bg-white sm:inline-grid sm:w-fit sm:grid-cols-4">
          {KINDS.map((option, index) => (
            <label
              key={option.value}
              className={cn(
                "has-[:focus-visible]:ring-amber-ink relative flex h-10 cursor-pointer items-center justify-center px-4 text-sm whitespace-nowrap transition-colors duration-150 has-[:focus-visible]:z-10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset pointer-coarse:h-11",
                index > 0 && "sm:border-line-strong sm:border-l",
                index % 2 === 1 && "max-sm:border-line-strong max-sm:border-l",
                index > 1 && "max-sm:border-line-strong max-sm:border-t",
                kind === option.value
                  ? "bg-ink font-medium text-white"
                  : "text-ink hover:bg-surface-alt",
              )}
            >
              <input
                type="radio"
                name={`kind-ui-${uid}`}
                value={option.value}
                checked={kind === option.value}
                onChange={() => setKind(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
        <p className="text-steel text-[13px]/[18px]">
          {KINDS.find((option) => option.value === kind)?.hint}
        </p>
        <InlineError message={errors.kind} />
      </fieldset>

      {labour ? (
        <div className="grid max-w-xl gap-1.5 text-sm">
          <span className="text-ink font-medium">Secção da oficina</span>
          <SearchSelect
            key={`sector-${resetKey}`}
            name="sectorId"
            ariaLabel="Secção da oficina"
            placeholder="Escolha a secção…"
            emptyText="Nenhuma secção com esse nome."
            defaultValue={sectorId}
            onValueChange={setSectorId}
            invalid={Boolean(errors.sectorId)}
            options={sources.sectors.map((option) => ({
              value: option.id,
              label: option.name,
              hint: sectorHint(option),
            }))}
          />
          <InlineError message={errors.sectorId} />
        </div>
      ) : (
        <fieldset className="grid gap-3">
          <legend className="text-ink mb-1.5 text-sm font-medium">Material (do ERP)</legend>
          <input type="hidden" name="source" value={source} />
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <label className="flex min-h-10 items-center gap-2 pointer-coarse:min-h-11">
              <input
                type="radio"
                name="source-ui"
                checked={source === "fixed"}
                onChange={() => setSource("fixed")}
                className="size-4"
              />
              Sempre o mesmo
            </label>
            <label className="flex min-h-10 items-center gap-2 pointer-coarse:min-h-11">
              <input
                type="radio"
                name="source-ui"
                checked={source === "byOption"}
                onChange={() => setSource("byOption")}
                disabled={choiceOptions.length === 0}
                className="size-4"
              />
              Conforme o que o cliente escolhe (ex.: tubo em ferro ou em inox)
            </label>
          </div>
          {source === "fixed" ? (
            <div className="grid max-w-xl gap-1.5">
              <SearchSelect
                key={`material-${resetKey}`}
                name="materialId"
                ariaLabel="Material"
                placeholder="Escolha o material…"
                emptyText="Nenhum material com esse nome."
                defaultValue={materialId}
                onValueChange={(value) => {
                  setMaterialId(value);
                  const chosen = sources.articles.find((article) => article.id === value);
                  if (chosen && unit.trim() === "") setUnit(chosen.unit);
                }}
                invalid={Boolean(errors.materialId)}
                options={articles}
              />
              <InlineError message={errors.materialId} />
            </div>
          ) : (
            <div className="grid gap-3">
              <Field
                label="Escolha do cliente que decide o material"
                error={errors.articleOptionId}
                className="max-w-sm"
              >
                <Select
                  name="articleOptionId"
                  value={articleOptionId}
                  onChange={(event) => {
                    setArticleOptionId(event.target.value);
                    // Valores já ligados a um artigo (ex.: cores do Odoo) vêm preenchidos.
                    const chosen = choiceOptions.find((option) => option.id === event.target.value);
                    setMapping(
                      (chosen?.values ?? [])
                        .filter((value) => value.materialId)
                        .map((value) => ({
                          optionValueId: value.id,
                          materialId: value.materialId!,
                        })),
                    );
                  }}
                >
                  <option value="">Escolha…</option>
                  {choiceOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </Select>
              </Field>
              {byOption && (
                <div className="grid max-w-2xl gap-2">
                  {byOption.values.map((value) => (
                    <div
                      key={value.id}
                      className="grid gap-1.5 text-sm sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center sm:gap-3"
                    >
                      <span className="text-ink">Com «{value.label}»</span>
                      <SearchSelect
                        name={`mapping-ui-${value.id}`}
                        ariaLabel={`Material para ${value.label}`}
                        placeholder="Não é possível com este valor"
                        emptyText="Nenhum material com esse nome."
                        defaultValue={
                          mapping.find((row) => row.optionValueId === value.id)?.materialId ?? ""
                        }
                        onValueChange={(materialValue) =>
                          setMapping((current) => [
                            ...current.filter((row) => row.optionValueId !== value.id),
                            ...(materialValue
                              ? [{ optionValueId: value.id, materialId: materialValue }]
                              : []),
                          ])
                        }
                        options={[
                          { value: "", label: "Não é possível com este valor" },
                          ...articles,
                        ]}
                      />
                    </div>
                  ))}
                </div>
              )}
              <input type="hidden" name="mapping" value={JSON.stringify(mapping)} />
            </div>
          )}
        </fieldset>
      )}

      {marginMissing.length > 0 && (
        <Notice
          tone="warn"
          title="Falta a margem"
          action={
            <Link
              href={labour ? "/admin/mao-de-obra" : "/admin/materiais?filtro=sem-margem"}
              className="link-admin text-sm"
            >
              Definir margem
            </Link>
          }
        >
          {marginMissing.join(", ")}: sem margem, o preço não se calcula e o produto não se publica.
        </Notice>
      )}

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_7rem] md:items-start">
        <ExpressionInput
          key={`expr-${resetKey}`}
          name="quantityExpr"
          label={labour ? "Horas" : "Quantidade"}
          defaultValue={initial.quantityExpr}
          placeholder={labour ? "6 + 2,4 × L" : "2 × (L + H)"}
          unit={unit || (labour ? "h" : "")}
          names={context.names}
          options={context.options}
          variables={context.variables}
          checkAs={{ kind: "line" }}
          scope={context.scope}
          error={errors.quantityExpr ?? issues[0]}
        />
        <Field label="Unidade" error={errors.unit}>
          <input
            name="unit"
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            required
            maxLength={16}
            placeholder={labour ? "h" : "m"}
            className={fieldClass}
          />
        </Field>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-ink mb-1.5 text-sm font-medium">Só conta quando…</legend>
        <p className="text-steel -mt-1 text-[13px]/[18px]">
          Deixe sem condições para contar sempre. Ex.: a linha do motor só conta com «Motorizado».
        </p>
        <ConditionsEditor
          key={resetKey}
          name="conditions"
          options={options}
          initial={initial.conditions}
          emptyText="Conta sempre."
        />
        <InlineError message={errors.conditions} />
      </fieldset>

      {issues.length > 1 && (
        <Notice tone="danger" title="Esta linha tem problemas">
          <ul className="grid gap-0.5">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </Notice>
      )}
      <FormError message={state?.ok ? undefined : state?.message} />
      <div className="flex items-center gap-3">
        <SaveButton pending={pending}>{lineId ? "Guardar linha" : "Acrescentar linha"}</SaveButton>
      </div>
    </form>
  );
}
