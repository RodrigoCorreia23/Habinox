"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";
import { NUMERIC_OP_WORDS } from "@/components/admin/describe-rule";
import { fieldClass, Select } from "@/components/admin/field";
import { Button } from "@/components/ui/button";
import type { Condition } from "@/lib/options";

export interface OptionInfo {
  key: string;
  name: string;
  type: "dimension" | "number" | "choice" | "boolean";
  unit: string | null;
  values: { key: string; label: string; isDefault?: boolean }[];
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

const NUMERIC_OPS = Object.entries(NUMERIC_OP_WORDS) as [keyof typeof NUMERIC_OP_WORDS, string][];

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

function toConditions(rows: Row[], options: OptionInfo[]) {
  return rows
    .map((row) => toCondition(row, options))
    .filter((condition): condition is Condition => condition !== null);
}

function defaultOp(type: OptionInfo["type"]) {
  return type === "choice" ? "in" : type === "boolean" ? "is_true" : "gt";
}

function emptyRow(options: OptionInfo[]): Row {
  return {
    option: options[0]!.key,
    op: defaultOp(options[0]!.type),
    values: [],
    number: "",
    refOption: "",
    factor: "1",
  };
}

const unitOf = (option: OptionInfo) => option.unit ?? (option.type === "dimension" ? "mm" : null);

/**
 * Lista de condições, todas obrigatórias ("e"), escritas como frase:
 * «Se Material é Inox e Largura maior que 3 000 mm». Grava-se como JSON num
 * campo escondido; o servidor valida-o com o mesmo esquema das regras.
 */
export function ConditionsEditor({
  name,
  options,
  initial,
  startWithEmpty = false,
  onChange,
  emptyText = "Aplica-se sempre.",
}: {
  name: string;
  options: OptionInfo[];
  initial: Condition[];
  /** Começa já com uma condição vazia (regra nova). */
  startWithEmpty?: boolean;
  /** Chamado com as condições completas (e o número de linhas) sempre que mudam. */
  onChange?: (conditions: Condition[], rowCount: number) => void;
  emptyText?: string;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    initial.length === 0 && startWithEmpty && options.length > 0
      ? [emptyRow(options)]
      : initial.map(toRow),
  );
  // Uma linha vazia acabada de abrir não é um erro: o aviso só aparece depois de mexer.
  const [edited, setEdited] = useState(false);
  const conditions = toConditions(rows, options);
  const incomplete = rows.length - conditions.length;

  const commit = (next: Row[]) => {
    setRows(next);
    setEdited(true);
    onChange?.(toConditions(next, options), next.length);
  };
  const update = (index: number, change: Partial<Row>) =>
    commit(rows.map((row, i) => (i === index ? { ...row, ...change } : row)));

  return (
    <div className="grid gap-3">
      <input type="hidden" name={name} value={JSON.stringify(conditions)} />
      {rows.length === 0 && <p className="text-steel text-[13px]">{emptyText}</p>}
      {rows.map((row, index) => {
        const option = options.find((candidate) => candidate.key === row.option);
        const numeric = option?.type === "dimension" || option?.type === "number";
        const others = numeric
          ? options.filter((other) => other.key !== row.option && other.type === option!.type)
          : [];
        const unit = option ? unitOf(option) : null;
        return (
          <div
            key={index}
            className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm max-sm:items-stretch"
          >
            <span className="text-ink w-6 shrink-0 text-sm max-sm:w-full">
              {index === 0 ? "Se" : "e"}
            </span>
            <Select
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
                  factor: "1",
                });
              }}
              wrapperClassName="max-sm:w-full"
            >
              {options.map((candidate) => (
                <option key={candidate.key} value={candidate.key}>
                  {candidate.name}
                </option>
              ))}
            </Select>

            {option?.type === "choice" && (
              <>
                <Select
                  aria-label="Comparação"
                  value={row.op}
                  onChange={(event) => update(index, { op: event.target.value })}
                >
                  <option value="in">é</option>
                  <option value="not_in">não é</option>
                </Select>
                <span className="flex flex-wrap gap-x-4 gap-y-1">
                  {option.values.map((value) => (
                    <label
                      key={value.key}
                      className="flex min-h-10 items-center gap-2 pointer-coarse:min-h-11"
                    >
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
                        className="size-4"
                      />
                      {value.label}
                    </label>
                  ))}
                </span>
              </>
            )}

            {option?.type === "boolean" && (
              <Select
                aria-label="Comparação"
                value={row.op}
                onChange={(event) => update(index, { op: event.target.value })}
              >
                <option value="is_true">é Sim</option>
                <option value="is_false">é Não</option>
              </Select>
            )}

            {numeric && (
              <>
                <Select
                  aria-label="Comparação"
                  value={row.op}
                  onChange={(event) => update(index, { op: event.target.value })}
                >
                  {NUMERIC_OPS.map(([value, words]) => (
                    <option key={value} value={value}>
                      {words}
                    </option>
                  ))}
                </Select>
                {row.refOption ? (
                  <span className="flex items-center gap-2">
                    <input
                      aria-label="Quantas vezes"
                      value={row.factor}
                      onChange={(event) => update(index, { factor: event.target.value })}
                      inputMode="decimal"
                      className={`${fieldClass} w-20 text-right tabular-nums`}
                    />
                    <span className="text-steel">vezes</span>
                    <Select
                      aria-label="Outra medida"
                      value={row.refOption}
                      onChange={(event) => update(index, { refOption: event.target.value })}
                    >
                      {others.map((other) => (
                        <option key={other.key} value={other.key}>
                          {other.name}
                        </option>
                      ))}
                    </Select>
                  </span>
                ) : (
                  <span className="relative inline-flex">
                    <input
                      aria-label={unit ? `Valor em ${unit}` : "Valor"}
                      value={row.number}
                      onChange={(event) => update(index, { number: event.target.value })}
                      inputMode="decimal"
                      className={`${fieldClass} w-32 text-right tabular-nums ${unit ? "pr-11" : ""}`}
                    />
                    {unit && (
                      <span
                        aria-hidden
                        className="text-steel pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
                      >
                        {unit}
                      </span>
                    )}
                  </span>
                )}
              </>
            )}

            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Remover condição"
              title="Remover condição"
              onClick={() => commit(rows.filter((_, i) => i !== index))}
            >
              <XIcon strokeWidth={1.75} />
            </Button>

            {numeric && others.length > 0 && (
              // Avançado: comparar com outra medida (ex.: Altura maior que Largura).
              <span className="basis-full pl-8 max-sm:pl-0">
                <Button
                  type="button"
                  variant="link"
                  className="text-[13px] font-normal"
                  onClick={() =>
                    update(index, {
                      refOption: row.refOption ? "" : others[0]!.key,
                      factor: "1",
                      number: "",
                    })
                  }
                >
                  {row.refOption ? "Comparar com um número" : "Comparar com outra medida"}
                </Button>
              </span>
            )}
          </div>
        );
      })}
      {incomplete > 0 && edited && (
        <p className="text-danger text-[13px]">
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
            variant="outline"
            onClick={() => commit([...rows, emptyRow(options)])}
          >
            + Acrescentar condição
          </Button>
        </div>
      )}
    </div>
  );
}
