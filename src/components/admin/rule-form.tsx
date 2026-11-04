"use client";

import { useActionState, useRef, useState } from "react";
import { type RuleFormState, type RuleScope, saveRuleAction } from "@/app/admin/rule-actions";
import { ConditionsEditor, type OptionInfo } from "@/components/admin/conditions-editor";
import { Field, fieldClass, FormStatus } from "@/components/admin/field";
import { submitKeepingValues } from "@/components/admin/submit-keeping-values";
import { Button } from "@/components/ui/button";
import type { Condition, RuleEffect } from "@/lib/options";

const EFFECTS = [
  ["restrict", "só permite os valores"],
  ["hide", "esconde a opção"],
  ["require", "torna obrigatória a opção"],
  ["forbid", "não é possível (mostra mensagem)"],
] as const;

export interface RuleValues {
  conditions: Condition[];
  effect: RuleEffect;
  message: string;
}

export function RuleForm({
  scope,
  ruleId,
  initial,
  options,
  issues = [],
}: {
  scope: RuleScope;
  ruleId: string | null;
  initial: RuleValues;
  options: OptionInfo[];
  issues?: string[];
}) {
  const [type, setType] = useState<RuleEffect["type"]>(initial.effect.type);
  const [target, setTarget] = useState("option" in initial.effect ? initial.effect.option : "");
  const [resetKey, setResetKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<RuleFormState, FormData>(
    async (previous, formData) => {
      const result = await saveRuleAction(scope, ruleId, previous, formData);
      if (ruleId === null && result?.ok) {
        formRef.current?.reset();
        setType("restrict");
        setTarget("");
        setResetKey((key) => key + 1);
      }
      return result;
    },
    null,
  );
  const errors = state?.fieldErrors ?? {};
  const targetOption = options.find((option) => option.key === target);
  const chosen = new Set(initial.effect.type === "restrict" ? initial.effect.values : []);

  return (
    <form ref={formRef} onSubmit={submitKeepingValues(action)} className="grid gap-4">
      <ConditionsEditor
        key={resetKey}
        name="conditions"
        options={options}
        initial={initial.conditions}
      />
      {errors.conditions && <p className="text-error text-xs">{errors.conditions}</p>}

      <div className="flex flex-wrap items-start gap-3 text-sm">
        <span className="text-steel w-8 pt-2 text-xs">então</span>
        <select
          name="effectType"
          aria-label="Efeito"
          value={type}
          onChange={(event) => setType(event.target.value as RuleEffect["type"])}
          className={fieldClass}
        >
          {EFFECTS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {type !== "forbid" && (
          <select
            name="effectOption"
            aria-label="Opção afetada"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            className={fieldClass}
          >
            <option value="">Escolha a opção…</option>
            {options
              .filter((option) => type !== "restrict" || option.type === "choice")
              .map((option) => (
                <option key={option.key} value={option.key}>
                  {option.name}
                </option>
              ))}
          </select>
        )}
        {type === "restrict" && targetOption && (
          <span key={`${resetKey}-${target}`} className="flex flex-wrap gap-x-3 gap-y-1 pt-1.5">
            {targetOption.values.map((value) => (
              <label key={value.key} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  name="effectValues"
                  value={value.key}
                  defaultChecked={chosen.has(value.key)}
                  className="accent-brand size-4"
                />
                {value.label}
              </label>
            ))}
          </span>
        )}
      </div>
      {errors.effect && <p className="text-error text-xs">{errors.effect}</p>}

      <Field
        label={type === "forbid" ? "Mensagem para o cliente" : "Mensagem para o cliente (opcional)"}
        error={errors.message}
        className="max-w-2xl"
      >
        <input
          name="message"
          defaultValue={initial.message}
          maxLength={300}
          placeholder={type === "forbid" ? "Não fabricamos chapa perfurada em inox" : ""}
          className={fieldClass}
        />
      </Field>

      {issues.length > 0 && (
        <ul className="text-error grid gap-0.5 text-xs">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}
      {state?.message && !state.ok && <p className="text-error text-sm">{state.message}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" variant={ruleId ? "outline" : "default"} disabled={pending}>
          {ruleId ? "Guardar regra" : "Acrescentar regra"}
        </Button>
        <FormStatus pending={pending} state={state} />
      </div>
    </form>
  );
}
