import type { ComponentProps } from "react";

export const authInputClass =
  "bg-night-surface border-night-line-strong focus-visible:border-amber aria-invalid:border-night-error-border mt-1.5 block min-h-12 w-full rounded-[2px] border px-3 text-base outline-none aria-invalid:border-2";

export function Field({
  id,
  label,
  hint,
  ...inputProps
}: { id: string; label: string; hint?: string } & ComponentProps<"input">) {
  return (
    <div>
      <label htmlFor={id} className="text-night-soft block text-[13px]">
        {label}
        <input
          id={id}
          name={id}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={authInputClass}
          {...inputProps}
        />
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-night-faint mt-1.5 text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
