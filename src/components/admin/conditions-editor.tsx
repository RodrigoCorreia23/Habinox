"use client";

import { useState } from "react";
import { fieldClass } from "@/components/admin/field";
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
