"use client";

/**
 * Linhas que se abrem no sítio para editar (opções, linhas de custo, contas
 * auxiliares, regras). A linha inteira é clicável e tem a seta ▸/▾ à vista; só
 * uma fica aberta de cada vez. Com alterações por guardar, um ponto âmbar no
 * resumo e o browser pergunta antes de sair. Depois de guardar, fecha e avisa.
 * Um endereço #id (ex.: «Corrigir» → #linha-…) abre a linha certa.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "cn";
import { ChevronRight, Plus } from "lucide-react";
import { RowMenu, RowMenuItem } from "@/components/admin/row-menu";
import { useToast } from "@/components/admin/toaster";
import { Button } from "@/components/ui/button";

type GroupValue = {
  openId: string | null;
  open: (id: string, options?: { focusDanger?: boolean }) => void;
  close: (id: string) => void;
  setDirty: (id: string, dirty: boolean) => void;
};

const GroupContext = createContext<GroupValue | null>(null);

type RowValue = { id: string; dirty: boolean; saved: (message: string) => void };
const RowContext = createContext<RowValue | null>(null);

/** Envolve o editor: garante uma só linha aberta e o aviso ao sair com alterações. */
export function InlineEditGroup({ children }: { children: React.ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set());
  const focusDanger = useRef<string | null>(null);

  useEffect(() => {
    if (dirtyIds.size === 0) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirtyIds]);

  // Depois de abrir pelo menu «Apagar…», o foco vai para o botão de apagar (depois de o
  // menu fechar e devolver o foco ao «⋯»).
  useEffect(() => {
    if (!openId || focusDanger.current !== openId) return;
    focusDanger.current = null;
    const timer = setTimeout(() => {
      document
        .getElementById(openId)
        ?.querySelector<HTMLButtonElement>("[data-danger] button")
        ?.focus();
    }, 200);
    return () => clearTimeout(timer);
  }, [openId]);

  const open = useCallback((id: string, options?: { focusDanger?: boolean }) => {
    if (options?.focusDanger) focusDanger.current = id;
    setOpenId(id);
  }, []);
  const close = useCallback(
    (id: string) => setOpenId((current) => (current === id ? null : current)),
    [],
  );
  const setDirty = useCallback((id: string, dirty: boolean) => {
    setDirtyIds((current) => {
      if (current.has(id) === dirty) return current;
      const next = new Set(current);
      if (dirty) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  // «Corrigir» e as ligações da decomposição apontam para #id: abre essa linha.
  useEffect(() => {
    const fromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const element = document.getElementById(id);
      if (element?.dataset.inlineRow !== undefined) {
        setOpenId(id);
        requestAnimationFrame(() => element.scrollIntoView({ block: "start" }));
      }
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const value = useMemo(() => ({ openId, open, close, setDirty }), [openId, open, close, setDirty]);
  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
}

/** Para os formulários dentro de uma linha: avisar que gravou (fecha e mostra o toast). */
export function useInlineRow() {
  return useContext(RowContext);
}

/**
 * Chamado pelos formulários depois de cada resposta da action: quando correu bem,
 * marca a linha como limpa, fecha-a e mostra o toast com a mensagem.
 */
export function useSavedEffect(state: { ok: boolean } | null, message: string) {
  const row = useInlineRow();
  const { toast } = useToast();
  const last = useRef(state);
  useEffect(() => {
    if (state === last.current) return;
    last.current = state;
    if (!state?.ok) return;
    if (row) row.saved(message);
    else toast({ tone: "ok", message });
  }, [state, row, message, toast]);
}

/**
 * Uma linha da lista. summary: o resumo (nome, material, valor no exemplo…);
 * aside: controlos à direita, por cima da área clicável (setas ↑↓, valores).
 * dangerLabel acrescenta ao menu ⋯ a entrada que abre a linha no botão de apagar.
 */
export function InlineEditRow({
  id,
  label,
  summary,
  aside,
  problem = false,
  dangerLabel,
  cleanOnSubmit = false,
  children,
  className,
}: {
  id: string;
  /** Nome do item, para os rótulos acessíveis («Editar Tubo do quadro»). */
  label: string;
  summary: React.ReactNode;
  aside?: React.ReactNode;
  problem?: boolean;
  dangerLabel?: string;
  /** Para formulários que não avisam quando gravam (ex.: RuleForm): limpa ao enviar. */
  cleanOnSubmit?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const group = useContext(GroupContext);
  const { toast } = useToast();
  const [dirty, setDirtyState] = useState(false);
  const open = group?.openId === id;
  const panelId = `${id}-editar`;

  const setDirty = useCallback(
    (next: boolean) => {
      setDirtyState(next);
      group?.setDirty(id, next);
    },
    [group, id],
  );

  // Uma linha apagada não pode deixar o aviso de «alterações por guardar» preso.
  const setGroupDirty = group?.setDirty;
  useEffect(() => () => setGroupDirty?.(id, false), [setGroupDirty, id]);

  const rowValue = useMemo<RowValue>(
    () => ({
      id,
      dirty,
      saved: (message: string) => {
        setDirty(false);
        group?.close(id);
        toast({ tone: "ok", message });
      },
    }),
    [id, dirty, setDirty, group, toast],
  );

  return (
    <li
      id={id}
      data-inline-row=""
      className={cn("scroll-mt-40", open && "bg-surface-alt/40", className)}
    >
      <div className="hover:bg-surface-alt/60 relative flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors duration-150">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`${open ? "Fechar" : "Editar"} ${label}`}
          onClick={() => (open ? group?.close(id) : group?.open(id))}
          className="focus-visible:ring-amber-ink absolute inset-0 z-0 cursor-pointer rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-inset"
        />
        <span aria-hidden className="pointer-events-none relative flex w-4 shrink-0 justify-center">
          <ChevronRight
            className={cn(
              "text-steel size-4 transition-transform duration-150 motion-reduce:transition-none",
              open && "rotate-90",
            )}
            strokeWidth={1.75}
          />
          {dirty && (
            <span
              title="Tem alterações por guardar"
              className="bg-amber absolute -top-1 -right-1.5 size-1.5 rounded-full"
            />
          )}
        </span>
        <div
          className={cn(
            "pointer-events-none relative min-w-0 flex-1 text-sm",
            problem && "text-danger",
          )}
        >
          {summary}
        </div>
        <div className="relative z-10 flex shrink-0 items-center gap-1">
          {aside}
          <RowMenu label={label}>
            <RowMenuItem onSelect={() => group?.open(id)}>Editar</RowMenuItem>
            {dangerLabel && (
              <RowMenuItem tone="danger" onSelect={() => group?.open(id, { focusDanger: true })}>
                {dangerLabel}
              </RowMenuItem>
            )}
          </RowMenu>
        </div>
      </div>
      <div
        id={panelId}
        hidden={!open}
        onInput={() => setDirty(true)}
        onChange={() => setDirty(true)}
        onReset={() => setDirty(false)}
        onSubmit={cleanOnSubmit ? () => setDirty(false) : undefined}
        className="border-line-soft border-t px-4 pt-4 pb-5 md:pl-11"
      >
        <RowContext.Provider value={rowValue}>{children}</RowContext.Provider>
      </div>
    </li>
  );
}

/** Linha só de leitura com o mesmo aspeto (versão na loja). */
export function StaticRow({
  id,
  summary,
  aside,
}: {
  id?: string;
  summary: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <li id={id} className="flex min-h-14 scroll-mt-40 items-center gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1 text-sm">{summary}</div>
      {aside && <div className="flex shrink-0 items-center gap-1">{aside}</div>}
    </li>
  );
}

/**
 * Formulário para acrescentar um item novo, por baixo da lista. Não tem botão
 * próprio: só aparece quando o «+ Acrescentar …» do cabeçalho da secção
 * (OpenRowButton) o abre, para haver uma única entrada para cada ação.
 * Fica montado quando fecha, para não perder o que já se escreveu.
 */
export function AddRow({
  id,
  label,
  children,
}: {
  id: string;
  /** Título do formulário aberto («Nova linha de custo»). */
  label: string;
  children: React.ReactNode;
}) {
  const group = useContext(GroupContext);
  const { toast } = useToast();
  const open = group?.openId === id;
  const panelId = `${id}-editar`;
  const titleId = `${id}-titulo`;
  const rowValue = useMemo<RowValue>(
    () => ({
      id,
      dirty: false,
      saved: (message: string) => {
        group?.setDirty(id, false);
        group?.close(id);
        toast({ tone: "ok", message });
      },
    }),
    [id, group, toast],
  );
  return (
    <div
      id={id}
      data-inline-row=""
      role="group"
      aria-labelledby={titleId}
      hidden={!open}
      className="bg-surface border-line mt-2 scroll-mt-40 rounded-[2px] border"
    >
      <div className="border-line-soft flex min-h-12 items-center gap-3 border-b py-1.5 pr-2 pl-4">
        <Plus aria-hidden className="text-steel size-4 shrink-0" strokeWidth={1.75} />
        <p id={titleId} className="text-ink min-w-0 flex-1 text-sm font-medium">
          {label}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            group?.setDirty(id, false);
            group?.close(id);
          }}
        >
          Cancelar
        </Button>
      </div>
      <div
        id={panelId}
        onInput={() => group?.setDirty(id, true)}
        className="px-4 pt-4 pb-5 md:pl-11"
      >
        <RowContext.Provider value={rowValue}>{children}</RowContext.Provider>
      </div>
    </div>
  );
}

/**
 * Botão «+ Acrescentar …» do cabeçalho de uma secção (ou do estado vazio): abre a
 * AddRow e leva até ela. É a única entrada para acrescentar.
 */
export function OpenRowButton({ rowId, children }: { rowId: string; children: React.ReactNode }) {
  const group = useContext(GroupContext);
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        group?.open(rowId);
        requestAnimationFrame(() => {
          const row = document.getElementById(rowId);
          row?.scrollIntoView({ block: "nearest" });
          row?.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea")?.focus();
        });
      }}
    >
      <Plus aria-hidden strokeWidth={1.75} />
      {children}
    </Button>
  );
}
