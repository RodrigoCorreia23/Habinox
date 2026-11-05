"use client";

import Link from "next/link";
import {
  createContext,
  useActionState,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { cn } from "cn";
import { CircleAlert, Plus } from "lucide-react";
import { EmptyState } from "@/components/admin/empty-state";
import { fieldClass, UnitInput } from "@/components/admin/field";
import { RowMenu, RowMenuItem } from "@/components/admin/row-menu";
import { StatusBadge } from "@/components/admin/status-badge";
import { useToast } from "@/components/admin/toaster";
import { useDirtyForm } from "@/components/admin/use-dirty-form";
import { submitKeepingValues } from "@/components/admin/submit-keeping-values";
import { Button } from "@/components/ui/button";
import { formatEuros } from "@/lib/money";
// Partilhados com Materiais: o mesmo padrão de edição em linha nas duas páginas de custos.
import { InlineField, type InlineStatus, InlineStatusText } from "../materiais/inline-field";
import { hourlyPriceCents } from "../materiais/margin-price";
import { archiveSectorAction, saveSectorAction, type SectorFormState } from "./actions";

export type SectorView = {
  id: string;
  name: string;
  /** Custo por hora para o campo ("23,50"). */
  rate: string;
  /** Margem em percentagem ("20"); "" = por decidir. */
  margin: string;
  usedBy: { id: string; name: string }[];
};

const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

// ── «+ Nova secção»: o botão vive no cabeçalho, a linha no fim da tabela ─────────

const NewSectorContext = createContext<{ open: boolean; setOpen: (open: boolean) => void }>({
  open: false,
  setOpen: () => {},
});

export function NewSectorProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <NewSectorContext value={{ open, setOpen }}>{children}</NewSectorContext>;
}

export function NewSectorButton() {
  const { open, setOpen } = useContext(NewSectorContext);
  return (
    <Button
      type="button"
      variant="outline"
      aria-expanded={open}
      aria-controls="nova-seccao"
      onClick={() => {
        setOpen(true);
        // A linha nova aparece no fim da tabela: leva-se lá o foco.
        requestAnimationFrame(() =>
          document.querySelector<HTMLInputElement>("#nova-seccao input[name=name]")?.focus(),
        );
      }}
    >
      <Plus aria-hidden strokeWidth={1.75} />
      Nova secção
    </Button>
  );
}

// ── Tabela ───────────────────────────────────────────────────────────────────

const th = "text-steel h-10 px-4 text-xs font-medium whitespace-nowrap";
const td = "px-4 py-3 align-top max-xl:p-0";
// Abaixo de xl a linha passa a bloco (com a barra lateral, a tabela só cabe a partir
// dos 1280 px): os rótulos aparecem por cima de cada campo.
const blockLabel = "text-steel mb-1.5 block text-[13px] xl:hidden";
// Valor só de leitura num bloco largo (md–xl): rótulo por cima, alinhado com os campos.
const blockValue = "md:max-xl:flex md:max-xl:min-h-9 md:max-xl:items-center";
const rowGrid =
  "max-xl:relative max-xl:grid max-xl:grid-cols-2 max-xl:gap-x-3 max-xl:gap-y-3 max-xl:p-4 md:max-xl:grid-cols-4";

export function SectorsTable({ sectors }: { sectors: SectorView[] }) {
  const { open } = useContext(NewSectorContext);

  if (sectors.length === 0) {
    return (
      <EmptyState title="Ainda não há secções da oficina.">
        <p>
          Cada secção tem o seu custo por hora e a sua margem; as fórmulas dos produtos contam as
          horas de cada uma. Exemplos: Serralharia, Corte laser, Pintura, Instalação em obra.
        </p>
        <NewSectorStacked />
      </EmptyState>
    );
  }

  return (
    <div className="bg-surface border-line rounded-[2px] border xl:overflow-x-auto">
      <table className="w-full border-collapse text-sm max-xl:block">
        <caption className="sr-only">Secções da oficina, com custo por hora e margem</caption>
        <thead className="max-xl:hidden">
          <tr className="border-line border-b">
            <th scope="col" className={cn(th, "text-left")}>
              Secção da oficina
            </th>
            <th scope="col" className={cn(th, "text-right")}>
              Custo por hora
            </th>
            <th scope="col" className={cn(th, "text-right")}>
              Margem
            </th>
            <th scope="col" className={cn(th, "py-1 text-right leading-4 whitespace-normal")}>
              Preço por hora ao cliente
            </th>
            <th scope="col" className={cn(th, "text-left")}>
              Usado em
            </th>
            <th scope="col" className={cn(th, "w-px px-2")}>
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody className="max-xl:block">
          {sectors.map((sector) => (
            <SectorRow key={sector.id} sector={sector} />
          ))}
          {open && <NewSectorRow />}
        </tbody>
      </table>
    </div>
  );
}

/** Preço por hora com margem, ao vivo; sem margem, o aviso de que bloqueia produtos. */
function HourlyPrice({
  rate,
  margin,
  used,
  flagMissing = true,
}: {
  rate: string;
  margin: string;
  used: number;
  /** Numa secção ainda por criar, a margem vazia não é um problema: mostra «—». */
  flagMissing?: boolean;
}) {
  const cents = hourlyPriceCents(rate, margin);
  if (cents !== null) {
    return (
      <span className="whitespace-nowrap tabular-nums">
        {formatEuros(cents)} <span className="text-steel">/ h</span>
      </span>
    );
  }
  if (flagMissing && margin.trim() === "") {
    return (
      <span className="inline-grid justify-items-end gap-1 max-xl:justify-items-start">
        <StatusBadge tone="danger">Falta margem</StatusBadge>
        {used > 0 && (
          <span className="text-danger text-[13px]/[18px]">
            {plural(used, "produto não se publica", "produtos não se publicam")}
          </span>
        )}
      </span>
    );
  }
  return (
    <span className="text-steel-light">
      <span aria-hidden>—</span>
      <span className="sr-only">sem valor</span>
    </span>
  );
}

/** Estado de um campo da linha, sem criar um objeto novo se não mudou. */
const withStatus =
  (field: string, status: InlineStatus) => (current: Record<string, InlineStatus>) =>
    current[field] === status ? current : { ...current, [field]: status };

function SectorRow({ sector }: { sector: SectorView }) {
  const { toast } = useToast();
  const [rate, setRate] = useState(sector.rate);
  const [margin, setMargin] = useState(sector.margin);
  const [statuses, setStatuses] = useState<Record<string, InlineStatus>>({});
  const [confirming, setConfirming] = useState(false);
  const [archiving, startArchive] = useTransition();
  // O servidor mandou valores novos (depois de guardar): o preço acompanha-os.
  const [last, setLast] = useState(sector);
  if (last !== sector) {
    setLast(sector);
    if (last.rate !== sector.rate) setRate(sector.rate);
    if (last.margin !== sector.margin) setMargin(sector.margin);
  }

  // Cada campo guarda sozinho, mas a action recebe sempre os três. As gravações da
  // linha vão em fila: cada uma só parte depois da anterior e manda os outros dois
  // campos com o último valor gravado com sucesso. Assim, mudar o custo e logo a
  // seguir a margem não apaga o custo novo.
  const confirmed = useRef({ name: sector.name, rate: sector.rate, margin: sector.margin });
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  // Valores novos do servidor (outra pessoa mudou, ou a página recarregou).
  useEffect(() => {
    confirmed.current = { name: sector.name, rate: sector.rate, margin: sector.margin };
  }, [sector.name, sector.rate, sector.margin]);

  const save = (field: "name" | "rate" | "margin", value: string) => {
    const run = queue.current.then(async () => {
      const values = { ...confirmed.current, [field]: value };
      const form = new FormData();
      form.set("name", values.name);
      form.set("rate", values.rate);
      form.set("margin", values.margin);
      const result = await saveSectorAction(sector.id, null, form);
      if (result?.ok) confirmed.current = values;
      return { ok: result?.ok ?? false, message: result?.message };
    });
    // Uma gravação que falhe não trava as seguintes.
    queue.current = run.catch(() => undefined);
    return run;
  };

  const onName = useCallback((status: InlineStatus) => setStatuses(withStatus("name", status)), []);
  const onRate = useCallback((status: InlineStatus) => setStatuses(withStatus("rate", status)), []);
  const onMargin = useCallback(
    (status: InlineStatus) => setStatuses(withStatus("margin", status)),
    [],
  );
  const all = Object.values(statuses);
  const rowStatus: InlineStatus = all.includes("pending")
    ? "pending"
    : all.includes("saved")
      ? "saved"
      : "idle";

  const archive = () =>
    startArchive(async () => {
      await archiveSectorAction(sector.id, true);
      setConfirming(false);
      toast({
        tone: "ok",
        message: `Secção «${sector.name}» arquivada.`,
        action: {
          label: "Desfazer",
          onClick: () => {
            void archiveSectorAction(sector.id, false).then(() =>
              toast({ tone: "ok", message: `Secção «${sector.name}» reposta.` }),
            );
          },
        },
      });
    });

  const used = sector.usedBy.length;

  return (
    <>
      <tr
        className={cn(
          "border-line-soft has-[[data-dirty]]:bg-surface-alt max-xl:border-line border-b transition-colors duration-150 last:border-b-0",
          rowGrid,
        )}
      >
        <td
          className={cn(td, "max-xl:col-span-2 max-md:pr-14 md:max-xl:col-span-4 md:max-xl:pr-40")}
        >
          <span className={blockLabel}>Secção da oficina</span>
          <InlineField
            name="name"
            value={sector.name}
            maxLength={80}
            label="Nome da secção"
            statusPlacement="none"
            onStatus={onName}
            commit={(value) => save("name", value)}
            className="md:max-xl:max-w-sm xl:w-44"
            inputClassName="md:h-9 font-medium"
          />
        </td>
        <td className={td}>
          <span className={blockLabel}>Custo por hora</span>
          <InlineField
            name="rate"
            unit="€/h"
            value={sector.rate}
            label={`Custo por hora de ${sector.name}, em euros`}
            statusPlacement="none"
            onStatus={onRate}
            onDraftChange={setRate}
            commit={(value) => save("rate", value)}
            className="xl:ml-auto xl:w-28"
            inputClassName="md:h-9"
          />
        </td>
        <td className={td}>
          <span className={blockLabel}>Margem</span>
          <InlineField
            name="margin"
            unit="%"
            value={sector.margin}
            placeholder="—"
            label={`Margem de ${sector.name}, em percentagem`}
            statusPlacement="none"
            onStatus={onMargin}
            onDraftChange={setMargin}
            commit={(value) => save("margin", value)}
            className="xl:ml-auto xl:w-24"
            inputClassName="md:h-9"
          />
        </td>
        <td
          className={cn(
            td,
            "max-md:col-span-2 max-md:flex max-md:items-start max-md:justify-between xl:pt-[1.3rem] xl:text-right",
          )}
        >
          <span className="text-steel text-[13px] md:max-xl:mb-1.5 md:max-xl:block xl:hidden">
            Preço por hora ao cliente
          </span>
          <span className={blockValue}>
            <HourlyPrice rate={rate} margin={margin} used={used} />
          </span>
        </td>
        <td
          className={cn(
            td,
            "whitespace-nowrap max-md:col-span-2 max-md:flex max-md:justify-between xl:pt-[1.3rem]",
          )}
        >
          <span className="text-steel text-[13px] md:max-xl:mb-1.5 md:max-xl:block xl:hidden">
            Usado em
          </span>
          {used > 0 ? (
            <Link
              href={`/admin/produtos?seccao=${sector.id}`}
              className={cn("link-admin", blockValue)}
              title={sector.usedBy.map((product) => product.name).join(", ")}
            >
              {plural(used, "produto", "produtos")}
            </Link>
          ) : (
            <span className={cn("text-steel-light", blockValue)}>0 produtos</span>
          )}
        </td>
        <td className={cn(td, "max-xl:absolute max-xl:top-3 max-xl:right-3 xl:px-2 xl:pt-3.5")}>
          <span className="flex items-center justify-end gap-1">
            <InlineStatusText status={rowStatus} className="max-md:hidden" />
            <RowMenu label={sector.name}>
              {used > 0 && (
                <RowMenuItem href={`/admin/produtos?seccao=${sector.id}`}>
                  Ver os produtos que a usam
                </RowMenuItem>
              )}
              <RowMenuItem tone="danger" onSelect={() => setConfirming(true)}>
                Arquivar secção…
              </RowMenuItem>
            </RowMenu>
          </span>
        </td>
      </tr>
      {confirming && (
        <tr className="bg-danger-bg/60 border-line-soft border-b max-xl:block">
          <td colSpan={6} className="px-4 py-3 max-xl:block">
            <ArchiveConfirm
              name={sector.name}
              used={used}
              pending={archiving}
              onConfirm={archive}
              onCancel={() => setConfirming(false)}
            />
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * Confirmação em linha de «Arquivar» (aberta pelo menu ⋯): diz o efeito e pede
 * confirmação no mesmo sítio, com Esc para desistir. É o comportamento do
 * ConfirmButton, aberto de fora (pedido à base: ConfirmButton com open controlado).
 */
function ArchiveConfirm({
  name,
  used,
  pending,
  onConfirm,
  onCancel,
}: {
  name: string;
  used: number;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => confirmRef.current?.focus(), []);
  return (
    <div
      role="group"
      aria-label={`Arquivar ${name}`}
      aria-live="polite"
      className="flex flex-wrap items-center gap-x-6 gap-y-3"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onCancel();
        }
      }}
    >
      <p className="max-w-prose min-w-0 flex-1 text-sm">
        <span className="text-ink font-medium">Arquivar «{name}»?</span>{" "}
        <span className="text-ink-soft">
          {used > 0
            ? `${plural(used, "produto usa", "produtos usam")} esta secção. Os preços atuais mantêm-se, mas deixa de a poder escolher em fórmulas novas.`
            : "Nenhum produto usa esta secção. Deixa de a poder escolher em fórmulas novas."}{" "}
          Pode repô-la quando quiser.
        </span>
      </p>
      <span className="flex items-center gap-2">
        <Button
          ref={confirmRef}
          type="button"
          size="sm"
          variant="destructive"
          pending={pending}
          pendingLabel="A arquivar…"
          onClick={onConfirm}
        >
          Arquivar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Não
        </Button>
      </span>
    </div>
  );
}

// ── Secção nova ───────────────────────────────────────────────────────────────

/** Estado comum às duas formas da secção nova (linha da tabela e formulário do estado vazio). */
function useNewSector(onCreated?: () => void) {
  const { toast } = useToast();
  const [state, action, pending] = useActionState<SectorFormState, FormData>(
    saveSectorAction.bind(null, null),
    null,
  );
  const [rate, setRate] = useState("");
  const [margin, setMargin] = useState("");
  const { formProps, markClean } = useDirtyForm();
  const formId = useId();

  // Cada resultado novo da action trata-se uma vez: foco no campo com erro, ou toast.
  const handled = useRef(state);
  useEffect(() => {
    if (state === handled.current) return;
    handled.current = state;
    if (state?.ok === false && state.field) {
      const form = document.getElementById(formId) as HTMLFormElement | null;
      const field = form?.elements.namedItem(state.field);
      if (field instanceof HTMLInputElement) field.focus();
    }
    if (state?.ok) {
      markClean();
      toast({ tone: "ok", message: state.message });
      onCreated?.();
    }
  }, [state, formId, markClean, toast, onCreated]);

  const errorFor = (field: "name" | "rate" | "margin") =>
    state?.ok === false && state.field === field ? state.message : undefined;

  return { state, action, pending, rate, setRate, margin, setMargin, formProps, formId, errorFor };
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <span id={id} className="text-danger mt-1.5 flex items-start gap-1.5 text-[13px]/[18px]">
      <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
      {message}
    </span>
  );
}

function NewSectorRow() {
  const { setOpen } = useContext(NewSectorContext);
  const s = useNewSector(() => setOpen(false));
  const errorId = (field: string) => `${s.formId}-${field}-erro`;
  const described = (field: "name" | "rate" | "margin") =>
    s.errorFor(field) ? { "aria-invalid": true, "aria-describedby": errorId(field) } : {};
  const formError = s.state?.ok === false && !s.state.field ? s.state.message : undefined;

  return (
    <tr
      id="nova-seccao"
      className={cn("bg-amber-wash/40 border-line border-t", rowGrid)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <td className={cn(td, "max-xl:col-span-2 md:max-xl:col-span-4")}>
        <label className={blockLabel} htmlFor={`${s.formId}-name`}>
          Nova secção
        </label>
        <input
          id={`${s.formId}-name`}
          form={s.formId}
          name="name"
          required
          maxLength={80}
          placeholder="ex.: Corte laser"
          aria-label="Nome da secção nova"
          {...described("name")}
          className={cn(fieldClass, "w-full md:h-9 md:max-xl:max-w-sm xl:w-44")}
        />
        <FieldError id={errorId("name")} message={s.errorFor("name")} />
      </td>
      <td className={td}>
        <span className={blockLabel}>Custo por hora</span>
        <UnitInput
          unit="€/h"
          form={s.formId}
          name="rate"
          required
          aria-label="Custo por hora da secção nova, em euros"
          onChange={(event) => s.setRate(event.target.value)}
          {...described("rate")}
          wrapperClassName="w-full md:flex xl:ml-auto xl:w-28"
          className="md:h-9"
        />
        <FieldError id={errorId("rate")} message={s.errorFor("rate")} />
      </td>
      <td className={td}>
        <span className={blockLabel}>Margem</span>
        <UnitInput
          unit="%"
          form={s.formId}
          name="margin"
          placeholder="—"
          aria-label="Margem da secção nova, em percentagem"
          onChange={(event) => s.setMargin(event.target.value)}
          {...described("margin")}
          wrapperClassName="w-full md:flex xl:ml-auto xl:w-24"
          className="md:h-9"
        />
        <FieldError id={errorId("margin")} message={s.errorFor("margin")} />
      </td>
      <td
        className={cn(
          td,
          "max-md:col-span-2 max-md:flex max-md:justify-between xl:pt-[1.3rem] xl:text-right",
        )}
      >
        <span className="text-steel text-[13px] md:max-xl:mb-1.5 md:max-xl:block xl:hidden">
          Preço por hora ao cliente
        </span>
        <span className={blockValue}>
          <HourlyPrice rate={s.rate} margin={s.margin} used={0} flagMissing={false} />
        </span>
      </td>
      <td colSpan={2} className={cn(td, "max-xl:col-span-2 md:max-xl:col-span-4")}>
        <form
          id={s.formId}
          onSubmit={submitKeepingValues(s.action)}
          {...s.formProps}
          className="flex items-center justify-end gap-2 max-xl:justify-start"
        >
          <Button type="submit" size="sm" pending={s.pending} pendingLabel="A criar…">
            Criar secção
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </form>
        {formError && <FieldError id={errorId("form")} message={formError} />}
      </td>
    </tr>
  );
}

/** Formulário da primeira secção, dentro do estado vazio. */
function NewSectorStacked() {
  const s = useNewSector();
  const errorId = (field: string) => `${s.formId}-${field}-erro`;
  const described = (field: "name" | "rate" | "margin") =>
    s.errorFor(field) ? { "aria-invalid": true, "aria-describedby": errorId(field) } : {};
  const formError = s.state?.ok === false && !s.state.field ? s.state.message : undefined;
  const label = "text-ink grid min-w-0 content-start gap-1.5 text-sm";

  return (
    <form
      id={s.formId}
      onSubmit={submitKeepingValues(s.action)}
      {...s.formProps}
      className="mt-5 grid max-w-2xl gap-4 sm:grid-cols-[minmax(0,1fr)_8rem_7rem] sm:items-start"
    >
      <label className={label}>
        <span className="font-medium">Nome da secção</span>
        <input
          name="name"
          required
          maxLength={80}
          placeholder="ex.: Serralharia"
          {...described("name")}
          className={cn(fieldClass, "w-full")}
        />
        <FieldError id={errorId("name")} message={s.errorFor("name")} />
      </label>
      <label className={label}>
        <span className="font-medium">Custo por hora</span>
        <UnitInput
          unit="€/h"
          name="rate"
          required
          onChange={(event) => s.setRate(event.target.value)}
          {...described("rate")}
        />
        <FieldError id={errorId("rate")} message={s.errorFor("rate")} />
      </label>
      <label className={label}>
        <span className="font-medium">Margem</span>
        <UnitInput
          unit="%"
          name="margin"
          placeholder="—"
          onChange={(event) => s.setMargin(event.target.value)}
          {...described("margin")}
        />
        <FieldError id={errorId("margin")} message={s.errorFor("margin")} />
      </label>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:col-span-3">
        <Button type="submit" pending={s.pending} pendingLabel="A criar…">
          Criar secção
        </Button>
        <span className="text-steel text-[13px]">
          Preço por hora ao cliente:{" "}
          <HourlyPrice rate={s.rate} margin={s.margin} used={0} flagMissing={false} />
        </span>
      </div>
      {formError && <FieldError id={errorId("form")} message={formError} />}
    </form>
  );
}

// ── Arquivadas ───────────────────────────────────────────────────────────────

export function RestoreSectorButton({ id, name }: { id: string; name: string }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      pending={pending}
      pendingLabel="A repor…"
      onClick={() =>
        startTransition(async () => {
          await archiveSectorAction(id, false);
          toast({ tone: "ok", message: `Secção «${name}» reposta.` });
        })
      }
    >
      Repor
    </Button>
  );
}
