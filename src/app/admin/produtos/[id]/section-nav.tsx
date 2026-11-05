"use client";

/**
 * Sub-navegação fixa do editor de produto: «1 Montra · 2 Opções 5 · 3 Regras ·
 * 4 Preço 4 linhas · 5 Publicar», cada passo com o seu estado (feito, «!» com
 * problemas, por fazer) e a secção à vista marcada com o traço âmbar.
 * Quando o cabeçalho sai do ecrã, a ação principal aparece à direita.
 * No telemóvel os passos fazem scroll horizontal: o passo à vista é trazido
 * para dentro da barra e um esbatimento na borda mostra que a lista continua.
 * (Variante local da StepList horizontal: a base não marca a secção à vista.)
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { Check } from "lucide-react";
import type { StepStatus } from "@/components/admin/step-list";

export type SectionStep = {
  id: string;
  title: string;
  status: StepStatus;
  detail?: string;
};

const STATUS_TEXT: Record<StepStatus, string> = {
  done: "feito",
  current: "a seguir",
  todo: "por fazer",
  problem: "tem problemas",
};

function Marker({ status, index }: { status: StepStatus; index: number }) {
  const base =
    "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] leading-none font-semibold tabular-nums";
  if (status === "done")
    return (
      <span aria-hidden className={cn(base, "bg-ink text-white")}>
        <Check className="size-3" strokeWidth={2.5} />
      </span>
    );
  if (status === "problem")
    return (
      <span aria-hidden className={cn(base, "bg-danger-bg text-danger ring-danger-line ring-1")}>
        !
      </span>
    );
  return (
    <span
      aria-hidden
      className={cn(
        base,
        status === "current"
          ? "ring-amber-ink text-amber-ink ring-2 ring-inset"
          : "ring-line-strong text-steel ring-1 ring-inset",
      )}
    >
      {index + 1}
    </span>
  );
}

/** Esbate a borda onde a lista continua, para se perceber que há mais passos. */
function fadeMask({ start, end }: { start: boolean; end: boolean }): React.CSSProperties {
  if (!start && !end) return {};
  const mask = `linear-gradient(to right, ${start ? "transparent 0, #000 32px" : "#000 0"}, ${
    end ? "#000 calc(100% - 40px), transparent 100%" : "#000 100%"
  })`;
  return { maskImage: mask, WebkitMaskImage: mask };
}

export function SectionNav({
  steps,
  headerId,
  action,
}: {
  steps: SectionStep[];
  /** O cabeçalho da página: enquanto está à vista, a ação fica só lá. */
  headerId: string;
  action?: React.ReactNode;
}) {
  const [active, setActive] = useState(steps[0]?.id ?? "");
  const [headerHidden, setHeaderHidden] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  // Há passos escondidos à esquerda / à direita da barra (só em ecrãs estreitos).
  const [overflow, setOverflow] = useState({ start: false, end: false });

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const update = () => {
      const max = list.scrollWidth - list.clientWidth;
      setOverflow({ start: list.scrollLeft > 4, end: list.scrollLeft < max - 4 });
    };
    update();
    list.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      list.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [steps]);

  // Traz o passo à vista para dentro da barra (só mexe no scroll horizontal
  // da lista, nunca no da página).
  useEffect(() => {
    const list = listRef.current;
    const item = list?.querySelector<HTMLElement>(`[data-step="${active}"]`);
    if (!list || !item) return;
    const margin = 24;
    // A lista é `relative`, por isso offsetLeft conta a partir do início dela.
    const left = item.offsetLeft;
    const right = left + item.offsetWidth;
    if (left - margin < list.scrollLeft) {
      list.scrollTo({ left: Math.max(0, left - margin), behavior: "smooth" });
    } else if (right + margin > list.scrollLeft + list.clientWidth) {
      list.scrollTo({ left: right + margin - list.clientWidth, behavior: "smooth" });
    }
  }, [active]);

  useEffect(() => {
    const sections = steps
      .map((step) => document.getElementById(step.id))
      .filter((element): element is HTMLElement => element !== null);
    const visible = new Map<string, number>();
    // A última secção é curta e nunca chega ao topo: no fim da página, fica ela marcada.
    const atBottom = () => {
      const root = document.documentElement;
      return window.innerHeight + window.scrollY >= root.scrollHeight - 4;
    };
    const pick = () => {
      const last = steps[steps.length - 1];
      if (last && atBottom()) return setActive(last.id);
      // A secção à vista mais acima.
      const top = [...visible.entries()].sort((a, b) => a[1] - b[1])[0];
      if (top) setActive(top[0]);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.boundingClientRect.top);
          else visible.delete(entry.target.id);
        }
        pick();
      },
      { rootMargin: "-140px 0px -55% 0px" },
    );
    for (const section of sections) observer.observe(section);
    window.addEventListener("scroll", pick, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", pick);
    };
  }, [steps]);

  useEffect(() => {
    const header = document.getElementById(headerId);
    if (!header) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeaderHidden(!entry!.isIntersecting),
      {
        rootMargin: "-64px 0px 0px 0px",
      },
    );
    observer.observe(header);
    return () => observer.disconnect();
  }, [headerId]);

  return (
    <nav
      aria-label="Passos do produto"
      className="bg-canvas/95 border-line sticky top-14 z-20 -mx-4 mb-8 flex items-center gap-4 border-b px-4 backdrop-blur-sm md:-mx-8 md:px-8 lg:top-0"
    >
      <ol
        ref={listRef}
        className="relative flex min-w-0 flex-1 items-center gap-x-1 overflow-x-auto whitespace-nowrap [scrollbar-width:none]"
        style={fadeMask(overflow)}
      >
        {steps.map((step, index) => {
          const current = step.id === active;
          return (
            <li key={step.id} data-step={step.id} className="shrink-0">
              <a
                href={`#${step.id}`}
                aria-current={current ? "location" : undefined}
                className={cn(
                  "focus-visible:ring-amber-ink relative flex h-12 items-center gap-2 rounded-[2px] px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset",
                  "hover:text-ink transition-colors duration-150",
                  current ? "text-ink font-medium" : "text-ink-soft",
                  current &&
                    "after:bg-amber after:absolute after:bottom-0 after:left-2.5 after:h-0.5 after:w-3",
                )}
              >
                <Marker status={step.status} index={index} />
                <span>
                  {step.title}
                  <span className="sr-only"> ({STATUS_TEXT[step.status]})</span>
                </span>
                {step.detail && (
                  <span
                    className={cn(
                      "text-[13px] tabular-nums",
                      step.status === "problem" ? "text-danger font-medium" : "text-steel",
                    )}
                  >
                    {step.detail}
                  </span>
                )}
              </a>
            </li>
          );
        })}
      </ol>
      {action && (
        <div className={cn("hidden shrink-0 py-2", headerHidden && "lg:block")}>{action}</div>
      )}
    </nav>
  );
}
