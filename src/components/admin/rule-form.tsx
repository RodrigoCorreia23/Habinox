"use client";

import { useActionState, useRef, useState } from "react";
import { type RuleFormState, type RuleScope, saveRuleAction } from "@/app/admin/rule-actions";
import { ConditionsEditor, type OptionInfo } from "@/components/admin/conditions-editor";
import { describeRule } from "@/components/admin/describe-rule";
import { Field, fieldClass, FormStatus, Select } from "@/components/admin/field";
import { Notice } from "@/components/admin/notice";
import { submitKeepingValues } from "@/components/admin/submit-keeping-values";
import { Button } from "@/components/ui/button";
import type { Condition, RuleEffect } from "@/lib/options";

/** O que a regra faz, dito como frase (os valores do FormData não mudam). */
const EFFECTS = [
  ["restrict", "limita os valores de…"],
  ["hide", "esconde…"],
  ["require", "obriga a preencher…"],
  ["forbid", "bloqueia a combinação e mostra a mensagem"],
] as const;

export interface RuleValues {
  conditions: Condition[];
  effect: RuleEffect;
  message: string;
}

/**
 * Construtor de regras em dois passos: «1. Quando…» (as condições) e «2. Então…»
 * (o efeito), com a frase final ao vivo por cima do botão. Uma regra sem condições
 * pede a confirmação «Aplicar a todos os produtos».
 */
export function RuleForm({
  scope,
  ruleId,
  initial,
  options,
  issues = [],
  affectedProducts,
}: {
  scope: RuleScope;
  ruleId: string | null;
  initial: RuleValues;
  options: OptionInfo[];
  issues?: string[];
  /** Produtos a que a regra se aplica, para dizer «Afeta: …». */
  affectedProducts?: string[];
}) {
  const [type, setType] = useState<RuleEffect["type"]>(initial.effect.type);
  const [target, setTarget] = useState("option" in initial.effect ? initial.effect.option : "");
  const [values, setValues] = useState<string[]>(
    initial.effect.type === "restrict" ? initial.effect.values : [],
  );
  const [message, setMessage] = useState(initial.message);
  const [conditions, setConditions] = useState<Condition[]>(initial.conditions);
  // Linhas de condição à vista (completas ou não): uma regra nova abre com uma vazia.
  const [rowCount, setRowCount] = useState(
    initial.conditions.length === 0 && ruleId === null && options.length > 0
      ? 1
      : initial.conditions.length,
  );
  const [resetKey, setResetKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<RuleFormState, FormData>(
    async (previous, formData) => {
      const result = await saveRuleAction(scope, ruleId, previous, formData);
      if (ruleId === null && result?.ok) {
        formRef.current?.reset();
        setType("restrict");
        setTarget("");
        setValues([]);
        setMessage("");
        setConditions([]);
        setRowCount(options.length > 0 ? 1 : 0);
        setResetKey((key) => key + 1);
      }
      return result;
    },
    null,
  );
  const errors = state?.fieldErrors ?? {};
  const targetOption = options.find((option) => option.key === target);
  const effect: RuleEffect =
    type === "forbid"
      ? { type }
      : type === "restrict"
        ? { type, option: target, values }
        : { type, option: target };
  const effectReady =
    type === "forbid"
      ? message.trim() !== ""
      : target !== "" && (type !== "restrict" || values.length > 0);
  const sentence = describeRule({ conditions, effect, message: message.trim() }, options);
  const id = ruleId ?? `nova-${resetKey}`;

  return (
    <form ref={formRef} onSubmit={submitKeepingValues(action)} className="grid gap-6">
      <fieldset className="grid gap-3">
        <legend className="text-ink mb-3 text-[15px]/[22px] font-semibold">1. Quando…</legend>
        <ConditionsEditor
          key={resetKey}
          name="conditions"
          options={options}
          initial={initial.conditions}
          startWithEmpty={ruleId === null}
          onChange={(next, rows) => {
            setConditions(next);
            setRowCount(rows);
          }}
          emptyText="Sem condições: a regra vale sempre."
        />
        {conditions.length === 0 && (rowCount === 0 || errors.conditions) && (
          <label className="text-ink flex min-h-10 items-center gap-2 text-sm pointer-coarse:min-h-11">
            <input type="checkbox" name="allProducts" className="size-4" />
            {scope ? "Aplicar sempre neste produto" : "Aplicar a todos os produtos"}
          </label>
        )}
        {errors.conditions && (
          <p id={`${id}-condicoes-erro`} className="text-danger text-[13px]">
            {errors.conditions}
          </p>
        )}
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="text-ink mb-3 text-[15px]/[22px] font-semibold">2. Então…</legend>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Select
            name="effectType"
            aria-label="O que a regra faz"
            value={type}
            onChange={(event) => setType(event.target.value as RuleEffect["type"])}
            wrapperClassName="max-sm:w-full"
          >
            {EFFECTS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          {type !== "forbid" && (
            <Select
              name="effectOption"
              aria-label="Opção afetada"
              value={target}
              onChange={(event) => {
                setTarget(event.target.value);
                setValues([]);
              }}
              aria-invalid={errors.effect && !target ? true : undefined}
              wrapperClassName="max-sm:w-full"
            >
              <option value="">Escolha a opção…</option>
              {options
                .filter((option) => type !== "restrict" || option.type === "choice")
                .map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.name}
                  </option>
                ))}
            </Select>
          )}
        </div>
        {type === "restrict" && targetOption && (
          <div className="grid gap-1">
            <p className="text-steel text-[13px]">Valores que ficam disponíveis:</p>
            <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {targetOption.values.map((value) => (
                <label
                  key={value.key}
                  className="flex min-h-10 items-center gap-2 pointer-coarse:min-h-11"
                >
                  <input
                    type="checkbox"
                    name="effectValues"
                    value={value.key}
                    checked={values.includes(value.key)}
                    onChange={(event) =>
                      setValues((current) =>
                        event.target.checked
                          ? [...current, value.key]
                          : current.filter((key) => key !== value.key),
                      )
                    }
                    className="size-4"
                  />
                  {value.label}
                </label>
              ))}
            </span>
          </div>
        )}
        {errors.effect && <p className="text-danger text-[13px]">{errors.effect}</p>}

        <Field
          label="Mensagem para o cliente"
          optional={type !== "forbid"}
          error={errors.message}
          hint={
            type === "forbid"
              ? "Aparece na loja quando o cliente escolhe esta combinação."
              : "Aparece na loja junto da opção afetada."
          }
          className="max-w-2xl"
        >
          <input
            name="message"
            id={`${id}-mensagem`}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={300}
            placeholder={type === "forbid" ? "Não fabricamos chapa perfurada em inox" : ""}
            className={fieldClass}
          />
        </Field>
      </fieldset>

      <div
        className="bg-surface-alt/60 grid gap-1 rounded-[2px] px-4 py-3 text-sm"
        aria-live="polite"
      >
        <p className="text-steel text-[13px]">A regra fica assim:</p>
        <p className="text-ink">
          {effectReady ? sentence : "Complete os dois passos para ver a frase."}
        </p>
        {affectedProducts && (
          <p className="text-steel text-[13px]">
            {affectedProducts.length > 0
              ? `Afeta: ${affectedProducts.join(", ")}`
              : "Nenhum produto usa estas opções."}
          </p>
        )}
      </div>

      {issues.length > 0 && (
        <Notice tone="danger" title="Esta regra tem problemas">
          <ul className="grid gap-0.5">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </Notice>
      )}
      {state?.message && !state.ok && <Notice tone="danger">{state.message}</Notice>}
      <div className="flex items-center gap-3">
        <Button type="submit" variant={ruleId ? "outline" : "default"} pending={pending}>
          {ruleId ? "Guardar regra" : "Acrescentar regra"}
        </Button>
        <FormStatus pending={false} state={state?.ok ? state : null} />
      </div>
    </form>
  );
}
