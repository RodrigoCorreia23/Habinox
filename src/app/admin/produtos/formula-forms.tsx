"use client";

import { useActionState, useRef, useState } from "react";
import { Field, fieldClass, FormStatus } from "@/components/admin/field";
import { submitKeepingValues } from "@/components/admin/submit-keeping-values";
import { Button } from "@/components/ui/button";
import { formatEuros } from "@/lib/money";
import type { Condition } from "@/lib/options";
import type { FormState } from "./actions";
import {
  consumablesAction,
  type PreviewResult,
  previewAction,
  saveLineAction,
  saveVariableAction,
} from "./formula-actions";

// ── Tipos partilhados com a página ──────────────────────────────────────────

export interface OptionInfo {
  key: string;
  name: string;
  type: "dimension" | "number" | "choice" | "boolean";
  unit: string | null;
  values: { key: string; label: string; isDefault?: boolean }[];
}

export interface ChoiceOptionInfo {
  id: string;
  key: string;
  name: string;
  values: { id: string; key: string; label: string }[];
}

export interface Sources {
  articles: { id: string; name: string; erpCode: string; unit: string }[];
  sectors: { id: string; name: string }[];
}

function Issues({ issues }: { issues: string[] }) {
  if (issues.length === 0) return null;
  return (
    <ul className="text-error grid gap-0.5 text-xs">
      {issues.map((issue) => (
        <li key={issue}>{issue}</li>
      ))}
    </ul>
  );
}

// ── Consumíveis ─────────────────────────────────────────────────────────────

export function ConsumablesForm({
  productId,
  versionId,
  percent,
  disabled,
}: {
  productId: string;
  versionId: string;
  percent: string;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    consumablesAction.bind(null, productId, versionId),
    null,
  );
  return (
    <form onSubmit={submitKeepingValues(action)} className="flex flex-wrap items-end gap-3">
      <Field
        label="Consumíveis"
        error={state?.fieldErrors?.rate}
        hint="Percentagem sobre o custo dos materiais (discos, gás, elétrodos…). Leva a margem de cada material."
      >
        <span className="relative w-28">
          <input
            name="rate"
            defaultValue={percent}
            inputMode="decimal"
            disabled={disabled}
            className={`${fieldClass} w-28 pr-6 text-right tabular-nums`}
          />
          <span className="text-steel pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs">
            %
          </span>
        </span>
      </Field>
      {!disabled && (
        <>
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            Guardar
          </Button>
          <FormStatus pending={pending} state={state} />
        </>
      )}
    </form>
  );
}

// ── Variáveis ───────────────────────────────────────────────────────────────

export function VariableForm({
  productId,
  versionId,
  variableId,
  initial,
  issues,
}: {
  productId: string;
  versionId: string;
  variableId: string | null;
  initial: { name: string; expr: string; label: string; showToCustomer: boolean };
  issues: string[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<FormState, FormData>(
    async (previous, formData) => {
      const result = await saveVariableAction(productId, versionId, variableId, previous, formData);
      if (variableId === null && result?.ok) formRef.current?.reset();
      return result;
    },
    null,
  );
  const errors = state?.fieldErrors ?? {};
  return (
    <form ref={formRef} onSubmit={submitKeepingValues(action)} className="grid gap-2">
      <div className="grid gap-3 md:grid-cols-[10rem_1fr_12rem_auto_auto] md:items-end">
        <Field label="Nome" error={errors.name}>
          <input
            name="name"
            defaultValue={initial.name}
            required
            maxLength={30}
            placeholder="degraus"
            className={`${fieldClass} font-mono`}
          />
        </Field>
        <Field label="Expressão" error={errors.expr}>
          <input
            name="expr"
            defaultValue={initial.expr}
            required
            maxLength={500}
            placeholder="ceil(H / 0,18)"
            className={`${fieldClass} font-mono`}
          />
        </Field>
        <Field label="Texto para o cliente" error={errors.label}>
          <input
            name="label"
            defaultValue={initial.label}
            maxLength={80}
            placeholder="Degraus"
            className={fieldClass}
          />
        </Field>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            name="showToCustomer"
            defaultChecked={initial.showToCustomer}
            className="accent-brand size-4"
          />
          Mostrar
        </label>
        <Button
          type="submit"
          size="sm"
          variant={variableId ? "outline" : "default"}
          disabled={pending}
        >
          {variableId ? "Guardar" : "Acrescentar"}
        </Button>
      </div>
      <Issues issues={issues} />
      <FormStatus pending={pending} state={state} />
    </form>
  );
}

// ── Condições ("só se…") ────────────────────────────────────────────────────

interface Row {
  option: string;
  op: string;
  values: string[];
  number: string;
  refOption: string;
  factor: string;
}

const NUMERIC_OPS = [
  ["gt", ">"],
  ["gte", "≥"],
  ["lt", "<"],
  ["lte", "≤"],
] as const;

function toRow(condition: Condition): Row {
  const base = { option: condition.option, values: [], number: "", refOption: "", factor: "1" };
  switch (condition.op) {
    case "eq":
      return { ...base, op: "in", values: [condition.value] };
    case "ne":
      return { ...base, op: "not_in", values: [condition.value] };
    case "in":
    case "not_in":
      return { ...base, op: condition.op, values: condition.values };
    case "is_true":
    case "is_false":
      return { ...base, op: condition.op };
    default:
      return typeof condition.value === "number"
        ? { ...base, op: condition.op, number: String(condition.value) }
        : {
            ...base,
            op: condition.op,
            refOption: condition.value.option,
            factor: String(condition.value.factor).replace(".", ","),
          };
  }
}

function toCondition(row: Row, options: OptionInfo[]): Condition | null {
  const option = options.find((candidate) => candidate.key === row.option);
  if (!option) return null;
  if (option.type === "choice") {
    if (row.values.length === 0) return null;
    return { option: row.option, op: row.op === "not_in" ? "not_in" : "in", values: row.values };
  }
  if (option.type === "boolean") {
    return { option: row.option, op: row.op === "is_false" ? "is_false" : "is_true" };
  }
  const op = (NUMERIC_OPS.find(([value]) => value === row.op)?.[0] ?? "gt") as
    "gt" | "gte" | "lt" | "lte";
  if (row.refOption) {
    const factor = Number(row.factor.replace(",", "."));
    if (!Number.isFinite(factor) || factor <= 0) return null;
    return { option: row.option, op, value: { option: row.refOption, factor } };
  }
  const number = Number(row.number.replace(",", "."));
  if (row.number.trim() === "" || !Number.isFinite(number)) return null;
  return { option: row.option, op, value: number };
}

function defaultOp(type: OptionInfo["type"]) {
  return type === "choice" ? "in" : type === "boolean" ? "is_true" : "gt";
}

/**
 * Lista de condições, todas obrigatórias ("e"). Grava-se como JSON num campo
 * escondido; o servidor valida-o com o mesmo esquema das regras.
 */
export function ConditionsEditor({
  name,
  options,
  initial,
}: {
  name: string;
  options: OptionInfo[];
  initial: Condition[];
}) {
  const [rows, setRows] = useState<Row[]>(() => initial.map(toRow));
  const conditions = rows
    .map((row) => toCondition(row, options))
    .filter((condition): condition is Condition => condition !== null);
  const incomplete = rows.length - conditions.length;
  const update = (index: number, change: Partial<Row>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...change } : row)));

  return (
    <div className="grid gap-2">
      <input type="hidden" name={name} value={JSON.stringify(conditions)} />
      {rows.length === 0 && <p className="text-steel text-xs">Aplica-se sempre.</p>}
      {rows.map((row, index) => {
        const option = options.find((candidate) => candidate.key === row.option);
        return (
          <div key={index} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-steel w-8 text-xs">{index === 0 ? "Se" : "e"}</span>
            <select
              aria-label="Opção"
              value={row.option}
              onChange={(event) => {
                const next = options.find((candidate) => candidate.key === event.target.value);
                update(index, {
                  option: event.target.value,
                  op: next ? defaultOp(next.type) : "in",
                  values: [],
                  number: "",
                  refOption: "",
                });
              }}
              className={fieldClass}
            >
              {options.map((candidate) => (
                <option key={candidate.key} value={candidate.key}>
                  {candidate.name}
                </option>
              ))}
            </select>
            {option?.type === "choice" && (
              <>
                <select
                  aria-label="Comparação"
                  value={row.op}
                  onChange={(event) => update(index, { op: event.target.value })}
                  className={fieldClass}
                >
                  <option value="in">é</option>
                  <option value="not_in">não é</option>
                </select>
                <span className="flex flex-wrap gap-x-3 gap-y-1">
                  {option.values.map((value) => (
                    <label key={value.key} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={row.values.includes(value.key)}
                        onChange={(event) =>
                          update(index, {
                            values: event.target.checked
                              ? [...row.values, value.key]
                              : row.values.filter((key) => key !== value.key),
                          })
                        }
                        className="accent-brand size-4"
                      />
                      {value.label}
                    </label>
                  ))}
                </span>
              </>
            )}
            {option?.type === "boolean" && (
              <select
                aria-label="Comparação"
                value={row.op}
                onChange={(event) => update(index, { op: event.target.value })}
                className={fieldClass}
              >
                <option value="is_true">é sim</option>
                <option value="is_false">é não</option>
              </select>
            )}
            {(option?.type === "dimension" || option?.type === "number") && (
              <>
                <select
                  aria-label="Comparação"
                  value={row.op}
                  onChange={(event) => update(index, { op: event.target.value })}
                  className={fieldClass}
                >
                  {NUMERIC_OPS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Comparar com"
                  value={row.refOption}
                  onChange={(event) => update(index, { refOption: event.target.value })}
                  className={fieldClass}
                >
                  <option value="">um número</option>
                  {options
                    .filter((other) => other.key !== row.option && other.type === option.type)
                    .map((other) => (
                      <option key={other.key} value={other.key}>
                        {other.name} ×
                      </option>
                    ))}
                </select>
                {row.refOption ? (
                  <input
                    aria-label="Fator"
                    value={row.factor}
                    onChange={(event) => update(index, { factor: event.target.value })}
                    inputMode="decimal"
                    className={`${fieldClass} w-20 text-right tabular-nums`}
                  />
                ) : (
                  <input
                    aria-label="Valor"
                    value={row.number}
                    onChange={(event) => update(index, { number: event.target.value })}
                    inputMode="decimal"
                    placeholder={option.type === "dimension" ? "mm" : ""}
                    className={`${fieldClass} w-28 text-right tabular-nums`}
                  />
                )}
              </>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
            >
              Tirar
            </Button>
          </div>
        );
      })}
      {incomplete > 0 && (
        <p className="text-error text-xs">
          {incomplete === 1
            ? "Uma condição está incompleta"
            : `${incomplete} condições estão incompletas`}{" "}
          e não será guardada.
        </p>
      )}
      {options.length > 0 && (
        <div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() =>
              setRows((current) => [
                ...current,
                {
                  option: options[0]!.key,
                  op: defaultOp(options[0]!.type),
                  values: [],
                  number: "",
                  refOption: "",
                  factor: "1",
                },
              ])
            }
          >
            + Condição
          </Button>
        </div>
      )}
    </div>
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

const KIND_LABELS: Record<LineValues["kind"], string> = {
  material: "Material",
  external: "Serviço externo (lacagem…)",
  component: "Componente (motor…)",
  labour: "Mão de obra",
};

export function LineForm({
  productId,
  versionId,
  lineId,
  initial,
  options,
  choiceOptions,
  sources,
  issues,
}: {
  productId: string;
  versionId: string;
  lineId: string | null;
  initial: LineValues;
  options: OptionInfo[];
  choiceOptions: ChoiceOptionInfo[];
  sources: Sources;
  issues: string[];
}) {
  const [kind, setKind] = useState(initial.kind);
  const [source, setSource] = useState(initial.source);
  const [articleOptionId, setArticleOptionId] = useState(initial.articleOptionId);
  const [mapping, setMapping] = useState(initial.mapping);
  const [resetKey, setResetKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<FormState, FormData>(
    async (previous, formData) => {
      const result = await saveLineAction(productId, versionId, lineId, previous, formData);
      if (lineId === null && result?.ok) {
        formRef.current?.reset();
        setKind("material");
        setSource("fixed");
        setArticleOptionId("");
        setMapping([]);
        setResetKey((key) => key + 1);
      }
      return result;
    },
    null,
  );
  const errors = state?.fieldErrors ?? {};
  const byOption = choiceOptions.find((option) => option.id === articleOptionId);

  return (
    <form ref={formRef} onSubmit={submitKeepingValues(action)} className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-[1fr_14rem_1fr_6rem]">
        <Field label="Nome da linha" error={errors.label}>
          <input
            name="label"
            defaultValue={initial.label}
            required
            maxLength={80}
            placeholder="Tubo do quadro"
            className={fieldClass}
          />
        </Field>
        <Field label="Tipo" error={errors.kind}>
          <select
            name="kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as LineValues["kind"])}
            className={fieldClass}
          >
            {Object.entries(KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label={kind === "labour" ? "Horas" : "Quantidade"}
          error={errors.quantityExpr}
          hint="Medidas em metros: L, H… · + − × ÷ · ceil, floor, round, min, max, sqrt (argumentos com ;)"
        >
          <input
            name="quantityExpr"
            defaultValue={initial.quantityExpr}
            required
            maxLength={500}
            placeholder={kind === "labour" ? "6 + 2,4 × L" : "2 × (L + H)"}
            className={`${fieldClass} font-mono`}
          />
        </Field>
        <Field label="Unidade" error={errors.unit}>
          <input
            name="unit"
            defaultValue={initial.unit}
            required
            maxLength={16}
            placeholder={kind === "labour" ? "h" : "m"}
            className={fieldClass}
          />
        </Field>
      </div>

      {kind === "labour" ? (
        <Field label="Sector" error={errors.sectorId} className="max-w-sm">
          <select name="sectorId" defaultValue={initial.sectorId} className={fieldClass}>
            <option value="">Escolha…</option>
            {sources.sectors.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.name}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <fieldset className="grid gap-3">
          <legend className="text-sm font-medium">Artigo do ERP</legend>
          <input type="hidden" name="source" value={source} />
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={source === "fixed"}
                onChange={() => setSource("fixed")}
                className="accent-brand size-4"
              />
              Sempre o mesmo
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={source === "byOption"}
                onChange={() => setSource("byOption")}
                disabled={choiceOptions.length === 0}
                className="accent-brand size-4"
              />
              Conforme uma opção (ex.: tubo em ferro ou em inox)
            </label>
          </div>
          {source === "fixed" ? (
            <Field label="Artigo" error={errors.materialId} className="max-w-md">
              <select name="materialId" defaultValue={initial.materialId} className={fieldClass}>
                <option value="">Escolha…</option>
                {sources.articles.map((article) => (
                  <option key={article.id} value={article.id}>
                    {article.name} ({article.erpCode}, por {article.unit})
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <div className="grid gap-3">
              <Field
                label="Opção que decide o artigo"
                error={errors.articleOptionId}
                className="max-w-sm"
              >
                <select
                  name="articleOptionId"
                  value={articleOptionId}
                  onChange={(event) => {
                    setArticleOptionId(event.target.value);
                    setMapping([]);
                  }}
                  className={fieldClass}
                >
                  <option value="">Escolha…</option>
                  {choiceOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </Field>
              {byOption && (
                <table className="max-w-2xl text-sm">
                  <tbody>
                    {byOption.values.map((value) => (
                      <tr key={value.id}>
                        <td className="py-1 pr-4">{value.label}</td>
                        <td className="py-1">
                          <select
                            aria-label={`Artigo para ${value.label}`}
                            value={
                              mapping.find((row) => row.optionValueId === value.id)?.materialId ??
                              ""
                            }
                            onChange={(event) =>
                              setMapping((current) => [
                                ...current.filter((row) => row.optionValueId !== value.id),
                                ...(event.target.value
                                  ? [{ optionValueId: value.id, materialId: event.target.value }]
                                  : []),
                              ])
                            }
                            className={`${fieldClass} w-full`}
                          >
                            <option value="">Não é possível com este valor</option>
                            {sources.articles.map((article) => (
                              <option key={article.id} value={article.id}>
                                {article.name} ({article.erpCode})
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <input type="hidden" name="mapping" value={JSON.stringify(mapping)} />
            </div>
          )}
        </fieldset>
      )}

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Só conta se…</legend>
        <ConditionsEditor
          key={resetKey}
          name="conditions"
          options={options}
          initial={initial.conditions}
        />
        {errors.conditions && <p className="text-error text-xs">{errors.conditions}</p>}
      </fieldset>

      <Issues issues={issues} />
      {state?.message && !state.ok && <p className="text-error text-sm">{state.message}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" variant={lineId ? "outline" : "default"} disabled={pending}>
          {lineId ? "Guardar linha" : "Acrescentar linha"}
        </Button>
        <FormStatus pending={pending} state={state} />
      </div>
    </form>
  );
}

// ── Preço de exemplo ────────────────────────────────────────────────────────

export function PreviewPanel({ versionId, options }: { versionId: string; options: OptionInfo[] }) {
  const [result, action, pending] = useActionState<PreviewResult, FormData>(
    previewAction.bind(null, versionId),
    null,
  );
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <form onSubmit={submitKeepingValues(action)} className="grid content-start gap-3">
        {options.map((option) => (
          <Field
            key={option.key}
            label={option.type === "dimension" ? `${option.name} (mm)` : option.name}
          >
            {option.type === "choice" ? (
              <select
                name={option.key}
                defaultValue={option.values.find((value) => value.isDefault)?.key ?? ""}
                className={fieldClass}
              >
                <option value="">—</option>
                {option.values.map((value) => (
                  <option key={value.key} value={value.key}>
                    {value.label}
                  </option>
                ))}
              </select>
            ) : option.type === "boolean" ? (
              <input type="checkbox" name={option.key} className="accent-brand size-4" />
            ) : (
              <input
                name={option.key}
                inputMode="decimal"
                className={`${fieldClass} tabular-nums`}
              />
            )}
          </Field>
        ))}
        <div>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "A calcular…" : "Calcular preço"}
          </Button>
        </div>
      </form>

      <div aria-live="polite">
        {result === null ? (
          <p className="text-steel text-sm">
            Escolha valores e carregue em “Calcular preço” para ver o preço e a decomposição.
          </p>
        ) : !result.ok ? (
          <div className="border-error bg-surface border-l-4 px-4 py-3 text-sm">
            <p className="font-semibold">Não foi possível calcular</p>
            <ul className="mt-1 grid gap-0.5">
              {result.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="border-line bg-surface overflow-x-auto border">
            <table className="w-full text-sm">
              <thead className="text-steel border-line border-b text-left text-xs">
                <tr>
                  <th className="px-3 py-2 font-medium">Linha</th>
                  <th className="px-3 py-2 text-right font-medium">Quantidade</th>
                  <th className="px-3 py-2 text-right font-medium">Custo</th>
                  <th className="px-3 py-2 text-right font-medium">Margem</th>
                  <th className="px-3 py-2 text-right font-medium">Preço s/ IVA</th>
                </tr>
              </thead>
              <tbody>
                {result.lines.map((line, index) => (
                  <tr key={index} className="border-line-soft border-b">
                    <td className="px-3 py-2">
                      {line.label}
                      <span className="text-steel block text-xs">{line.itemName}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {Number(line.quantity).toLocaleString("pt-PT", { maximumFractionDigits: 3 })}{" "}
                      {line.unit}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatEuros(line.costCents)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {(Number(line.margin) * 100).toLocaleString("pt-PT", {
                        maximumFractionDigits: 2,
                      })}
                      %
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatEuros(line.priceCents)}
                    </td>
                  </tr>
                ))}
                {result.consumables && (
                  <tr className="border-line-soft border-b">
                    <td className="px-3 py-2">
                      Consumíveis
                      <span className="text-steel block text-xs">
                        {(Number(result.consumables.rate) * 100).toLocaleString("pt-PT")}% dos
                        materiais
                      </span>
                    </td>
                    <td />
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatEuros(result.consumables.costCents)}
                    </td>
                    <td />
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatEuros(result.consumables.priceCents)}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td className="px-3 py-3 font-semibold" colSpan={4}>
                    Total sem IVA
                  </td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">
                    {formatEuros(result.netCents)}
                  </td>
                </tr>
              </tfoot>
            </table>
            {Object.keys(result.variables).length > 0 && (
              <p className="text-steel border-line border-t px-3 py-2 text-xs">
                {Object.entries(result.variables)
                  .map(
                    ([name, value]) =>
                      `${name} = ${value.toLocaleString("pt-PT", { maximumFractionDigits: 3 })}`,
                  )
                  .join(" · ")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
