/** Campos do backoffice: paleta clara, raio de 2px, sem sombras (DESIGN.md › Backoffice). */
export const fieldClass =
  "border-line-strong focus-visible:ring-brand/40 aria-invalid:border-error read-only:bg-surface-alt rounded-[2px] border bg-white px-2 py-1.5 text-sm outline-none focus-visible:ring-2";

export function Field({
  label,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`grid content-start gap-1 text-sm ${className ?? ""}`}>
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-steel text-xs">{hint}</span>}
      {error && <span className="text-error text-xs">{error}</span>}
    </label>
  );
}

export function FormStatus({
  pending,
  state,
}: {
  pending: boolean;
  state: { ok: boolean; message?: string } | null;
}) {
  return (
    <span role="status" className={`text-xs ${state?.ok === false ? "text-error" : "text-steel"}`}>
      {pending ? "A guardar…" : state?.message}
    </span>
  );
}
