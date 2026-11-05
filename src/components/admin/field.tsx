/**
 * Campos do backoffice (DESIGN.md › Backoffice): branco, raio de 2px, sem sombras,
 * 40px de altura (44px em ecrãs de toque) e 16px de letra no telemóvel (evita o zoom do iOS).
 * fieldClass não traz largura: o Field põe w-full nos filhos diretos; fora dele, junta-se a largura.
 * Server-safe: o FormStatus (cliente) vive em form-status.tsx e é reexportado daqui.
 */
import { Children, cloneElement, isValidElement } from "react";
import { cn } from "cn";
import { ChevronDown, CircleAlert } from "lucide-react";

export { FormStatus } from "./form-status";

export const fieldClass =
  "h-10 min-w-0 rounded-[2px] border border-line-strong bg-white px-3 text-base text-ink outline-none transition-colors duration-150 placeholder:text-steel-light focus-visible:ring-2 focus-visible:ring-amber-ink focus-visible:ring-offset-1 aria-invalid:border-2 aria-invalid:border-error [&:is(input,textarea):read-only]:bg-surface-alt disabled:opacity-60 pointer-coarse:h-11 md:text-sm";

export const textareaClass =
  "min-h-24 min-w-0 rounded-[2px] border border-line-strong bg-white px-3 py-2 text-base text-ink outline-none transition-colors duration-150 placeholder:text-steel-light focus-visible:ring-2 focus-visible:ring-amber-ink focus-visible:ring-offset-1 aria-invalid:border-2 aria-invalid:border-error [&:is(input,textarea):read-only]:bg-surface-alt disabled:opacity-60 md:text-sm";

type DescribableProps = {
  name?: string;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
};

/**
 * Rótulo + campo + ajuda + erro. O erro fica ligado ao campo por aria-describedby
 * (pelo name ou id do campo) e põe-lhe aria-invalid, que dá a borda de 2px.
 */
export function Field({
  label,
  error,
  hint,
  optional = false,
  className,
  children,
}: {
  label: React.ReactNode;
  error?: string;
  hint?: React.ReactNode;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const only = Children.count(children) === 1 && isValidElement<DescribableProps>(children);
  const base = only ? (children.props.id ?? children.props.name) : undefined;
  const hintId = base && hint ? `${base}-ajuda` : undefined;
  const errorId = base && error ? `${base}-erro` : undefined;
  const control =
    only && (hintId || errorId)
      ? cloneElement(children, {
          "aria-describedby":
            [children.props["aria-describedby"], errorId, hintId].filter(Boolean).join(" ") ||
            undefined,
          "aria-invalid": children.props["aria-invalid"] ?? (error ? true : undefined),
        })
      : children;

  return (
    <label
      className={cn(
        "grid min-w-0 content-start gap-1.5 text-sm",
        "[&>[data-control]]:w-full [&>input:not([type=checkbox]):not([type=radio])]:w-full [&>select]:w-full [&>textarea]:w-full",
        className,
      )}
    >
      <span className="text-ink flex items-baseline justify-between gap-3 font-medium">
        <span>{label}</span>
        {optional && <span className="text-steel-light text-[13px] font-normal">opcional</span>}
      </span>
      {control}
      {hint && (
        <span id={hintId} className="text-steel text-[13px]/[18px]">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="text-danger flex items-start gap-1.5 text-[13px]/[18px]">
          <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
          {error}
        </span>
      )}
    </label>
  );
}

/** Select nativo branco com a seta desenhada (nunca o cinzento do sistema). */
export function Select({
  className,
  wrapperClassName,
  children,
  ...props
}: React.ComponentProps<"select"> & { wrapperClassName?: string }) {
  return (
    <span data-control className={cn("relative inline-flex min-w-0", wrapperClassName)}>
      <select
        {...props}
        className={cn(fieldClass, "w-full cursor-pointer appearance-none pr-9", className)}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="text-steel pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
        strokeWidth={1.75}
      />
    </span>
  );
}

export type Unit = "mm" | "%" | "€" | "€/h" | "dias" | "m" | "m²" | "h";

/** Número com a unidade dentro do campo, à direita («30 %», «18,50 €/h»). */
export function UnitInput({
  unit,
  className,
  wrapperClassName,
  ...props
}: Omit<React.ComponentProps<"input">, "type"> & { unit: Unit; wrapperClassName?: string }) {
  return (
    <span data-control className={cn("relative inline-flex min-w-0", wrapperClassName)}>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        {...props}
        className={cn(fieldClass, "w-full pr-12 text-right tabular-nums", className)}
      />
      <span
        aria-hidden
        className="text-steel pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm"
      >
        {unit}
      </span>
    </span>
  );
}
