"use client";

import { useActionState } from "react";
import { FormStatus } from "@/components/admin/field";
import { submitKeepingValues } from "@/components/admin/submit-keeping-values";
import { Button } from "@/components/ui/button";
import type { EditableSetting } from "@/server/settings-form";
import { saveSettingAction, type SettingFormState } from "./actions";

const fieldClass =
  "border-line-strong focus-visible:ring-brand/40 aria-invalid:border-error h-8 rounded-[2px] border bg-white px-2 text-sm outline-none focus-visible:ring-2";

export function SettingForm({
  settingKey,
  label,
  initial,
  unit,
  type = "text",
  placeholder,
  wide = false,
}: {
  settingKey: EditableSetting;
  label: string;
  initial: string;
  unit?: string;
  type?: "text" | "email";
  placeholder?: string;
  wide?: boolean;
}) {
  const [state, action, pending] = useActionState<SettingFormState, FormData>(
    saveSettingAction.bind(null, settingKey),
    null,
  );
  const id = `setting-${settingKey}`;
  return (
    <form onSubmit={submitKeepingValues(action)} className="flex flex-wrap items-end gap-3">
      <label htmlFor={id} className="grid gap-1 text-xs">
        <span className="text-steel">{label}</span>
        <span className="relative w-fit">
          <input
            id={id}
            name="value"
            type={type}
            defaultValue={initial}
            placeholder={placeholder}
            inputMode={type === "text" ? "decimal" : undefined}
            aria-invalid={state?.ok === false ? true : undefined}
            className={`${fieldClass} ${wide ? "w-72" : "w-28 text-right tabular-nums"} ${unit ? "pr-10" : ""} placeholder:text-left placeholder:text-xs`}
          />
          {unit && (
            <span className="text-steel pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs">
              {unit}
            </span>
          )}
        </span>
      </label>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        Guardar
      </Button>
      <FormStatus pending={pending} state={state} />
    </form>
  );
}
