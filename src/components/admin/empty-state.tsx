import { cn } from "cn";

/** Estado vazio que ensina: o que aparece aqui, como começar e a ação a seguir. */
export function EmptyState({
  title,
  children,
  action,
  secondary,
  className,
}: {
  title: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  secondary?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-line rounded-[2px] border border-dashed p-8", className)}>
      <p className="text-ink text-sm font-semibold">{title}</p>
      {children && <div className="text-steel mt-1 max-w-prose text-sm">{children}</div>}
      {(action || secondary) && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {action}
          {secondary}
        </div>
      )}
    </div>
  );
}
