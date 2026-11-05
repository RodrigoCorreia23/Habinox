"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { cn } from "cn";
import { CircleAlert, CircleCheck, Info, XIcon } from "lucide-react";
import { Toast } from "radix-ui";

export type ToastTone = "ok" | "danger" | "info";
export type ToastInput = {
  tone: ToastTone;
  message: string;
  action?: { label: string; onClick: () => void };
};
type Item = ToastInput & { id: number; open: boolean };

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

const ICONS = { ok: CircleCheck, danger: CircleAlert, info: Info } as const;
const ICON_CLASS = { ok: "text-ok", danger: "text-danger", info: "text-info" } as const;

/** ok fecha em 3 s; com «Desfazer», em 8 s; um erro fica até se fechar. */
function durationOf(toast: ToastInput) {
  if (toast.tone === "danger") return Infinity;
  return toast.action ? 8000 : 3000;
}

/**
 * Avisos curtos do backoffice («Guardado», «Arquivada · Desfazer»). Vive no layout;
 * qualquer componente cliente lá dentro usa useToast().
 */
export function AdminToaster({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((input: ToastInput) => {
    const id = ++nextId.current;
    // No máximo 3 à vista: os mais antigos saem.
    setItems((current) => [...current.slice(-2), { ...input, id, open: true }]);
  }, []);

  const close = (id: number) =>
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, open: false } : item)),
    );
  const remove = (id: number) => setItems((current) => current.filter((item) => item.id !== id));

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      <Toast.Provider swipeDirection="right" label="Avisos">
        {children}
        {items.map((item) => {
          const Icon = ICONS[item.tone];
          return (
            <Toast.Root
              key={item.id}
              open={item.open}
              duration={durationOf(item)}
              type={item.tone === "danger" ? "foreground" : "background"}
              onOpenChange={(open) => {
                if (!open) {
                  close(item.id);
                  setTimeout(() => remove(item.id), 200);
                }
              }}
              className={cn(
                "bg-surface border-line text-ink flex items-start gap-3 rounded-[2px] border p-3 pr-2 text-sm shadow-[0_12px_32px_-12px_rgb(21_18_14/.28)]",
                "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-150",
                "data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x) data-[swipe=end]:translate-x-(--radix-toast-swipe-end-x)",
              )}
            >
              <Icon
                aria-hidden
                className={cn("mt-0.5 size-4 shrink-0", ICON_CLASS[item.tone])}
                strokeWidth={1.75}
              />
              <Toast.Description className="min-w-0 flex-1 pt-px">{item.message}</Toast.Description>
              {item.action && (
                <Toast.Action
                  altText={item.action.label}
                  onClick={item.action.onClick}
                  className="link-admin focus-visible:ring-amber-ink shrink-0 rounded-[2px] px-1 pt-px font-medium outline-none focus-visible:ring-2"
                >
                  {item.action.label}
                </Toast.Action>
              )}
              <Toast.Close
                aria-label="Fechar"
                className="text-steel hover:bg-surface-alt hover:text-ink focus-visible:ring-amber-ink -my-1 inline-flex size-7 shrink-0 items-center justify-center rounded-[2px] outline-none focus-visible:ring-2"
              >
                <XIcon className="size-4" strokeWidth={1.5} />
              </Toast.Close>
            </Toast.Root>
          );
        })}
        <Toast.Viewport className="fixed inset-x-0 bottom-0 z-[60] m-0 flex list-none flex-col gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] outline-none sm:inset-x-auto sm:right-0 sm:w-[392px]" />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}

/** toast({tone, message, action?}). Fora do AdminToaster não faz nada. */
export function useToast() {
  const toast = useContext(ToastContext);
  return {
    toast:
      toast ??
      ((input: ToastInput) => {
        if (process.env.NODE_ENV !== "production") {
          console.warn("useToast fora do AdminToaster:", input.message);
        }
      }),
  };
}
