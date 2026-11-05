import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";

/*
 * Botão do backoffice (DESIGN.md › Backoffice). Só o admin o usa.
 * default = primário âmbar (um por ecrã); outline/secondary = secundário branco;
 * destructive = ação perigosa em texto vermelho; danger = cheio, só para
 * confirmar dentro de um ConfirmDialog.
 */
const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center gap-2 rounded-[2px] border text-sm font-medium whitespace-nowrap transition-colors duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-amber-ink focus-visible:ring-offset-2 active:scale-[.98] motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "border-amber-border bg-amber text-on-amber hover:bg-amber-hover",
        outline:
          "border-line-strong bg-white text-ink hover:bg-surface-alt aria-expanded:bg-surface-alt",
        secondary:
          "border-line-strong bg-white text-ink hover:bg-surface-alt aria-expanded:bg-surface-alt",
        ghost: "border-transparent text-ink hover:bg-surface-alt aria-expanded:bg-surface-alt",
        destructive: "border-danger-line bg-white text-danger hover:bg-danger-bg",
        danger: "border-danger bg-danger text-white hover:bg-[#7f1a14]",
        link: "link-admin border-0 active:scale-100",
      },
      size: {
        default: "h-10 px-4 pointer-coarse:h-11",
        xs: "h-9 px-3 pointer-coarse:h-11",
        sm: "h-9 px-3 pointer-coarse:h-11",
        lg: "h-11 px-5",
        icon: "size-10 pointer-coarse:size-11",
        "icon-xs": "size-9 pointer-coarse:size-11",
        "icon-sm": "size-9 pointer-coarse:size-11",
        "icon-lg": "size-11",
      },
    },
    // A variante link é texto: sem altura nem espaço lateral próprios.
    compoundVariants: [{ variant: "link", class: "h-auto px-0 pointer-coarse:h-auto" }],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  pending = false,
  pendingLabel = "A guardar…",
  children,
  disabled,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Ação a decorrer: mostra pendingLabel, fica desativado e com aria-busy, sem mudar de largura. */
    pending?: boolean;
    pendingLabel?: string;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={asChild ? disabled : pending || disabled}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending && !asChild ? (
        // As duas etiquetas partilham a mesma célula: a largura nunca encolhe.
        <span className="grid">
          <span aria-hidden className="invisible col-start-1 row-start-1 flex items-center gap-2">
            {children}
          </span>
          <span className="col-start-1 row-start-1 text-center">{pendingLabel}</span>
        </span>
      ) : (
        children
      )}
    </Comp>
  );
}

export { Button, buttonVariants };
