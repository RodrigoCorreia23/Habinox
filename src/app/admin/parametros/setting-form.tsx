"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { cn } from "cn";
import { CircleAlert, Send } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { fieldClass, FormStatus, UnitInput } from "@/components/admin/field";
import { useToast } from "@/components/admin/toaster";
import { useDirtyForm } from "@/components/admin/use-dirty-form";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatDate } from "@/lib/format-date";
import { formatEuros, parseDecimal, vatCents } from "@/lib/money";
import { type EditableSetting, parseSettingInput } from "@/server/settings-form";
import { saveSettingAction, sendTestEmailAction, type SettingFormState } from "./actions";
import { settingInputId } from "./ids";
import type { PriceExample } from "./vat-example";

const DAY = 86_400_000;

/**
 * Estado comum a cada linha: a action com o seu resultado, o valor guardado
 * (para comparar e para a confirmação «de X para Y»), as alterações por guardar
 * (com aviso ao sair da página) e o foco no campo quando o servidor recusa.
 */
function useSettingForm(
  key: EditableSetting,
  initial: string,
  inputRef: React.RefObject<HTMLInputElement | null>,
) {
  const [state, dispatch, pending] = useActionState<SettingFormState, FormData>(
    saveSettingAction.bind(null, key),
    null,
  );
  const [saved, setSaved] = useState(initial);
  const submitted = useRef(initial);
  const { dirty, formProps, markClean } = useDirtyForm();
  // O erro do servidor sai assim que o Bruno volta a escrever (deixa de ser sobre o valor à vista).
  const [dismissed, setDismissed] = useState<SettingFormState>(null);
  const error = state && !state.ok && state !== dismissed ? state.message : null;
  const markEdited = () => {
    formProps.onInput();
    if (state && !state.ok) setDismissed(state);
  };

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      setSaved(submitted.current);
      markClean();
    } else {
      inputRef.current?.focus();
    }
  }, [state, markClean, inputRef]);

  const submit = (value: string) => {
    submitted.current = value;
    const formData = new FormData();
    formData.set("value", value);
    // Dentro de uma transição: o pending do useActionState («A guardar…») só funciona assim.
    startTransition(() => dispatch(formData));
  };

  return { state, pending, saved, dirty, error, markEdited, submit };
}

type Form = ReturnType<typeof useSettingForm>;

/** Erro por baixo do campo, ligado por aria-describedby. */
function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className="text-danger flex items-start gap-1.5 text-[13px]/[18px]">
      <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
      {message}
    </p>
  );
}

/** «A guardar…», «Guardado ✓» ou o ponto âmbar das alterações por guardar. */
function RowStatus({ form }: { form: Form }) {
  if (!form.pending && form.dirty && !form.error) {
    return (
      <span className="text-steel inline-flex items-center gap-1.5 text-[13px]/[18px]">
        <span aria-hidden className="bg-amber size-1.5 rounded-full" />
        Por guardar
      </span>
    );
  }
  return <FormStatus pending={form.pending} state={form.state?.ok ? form.state : null} />;
}

/**
 * Esqueleto de cada linha: o campo e o Guardar na mesma coluna, o erro por baixo
 * e a pré-visualização do efeito. O envio passa por onSubmit para nunca sair sem
 * a confirmação (Enter no campo também a pede).
 */
function RowForm({
  form,
  errorId,
  onSubmit,
  control,
  button,
  preview,
  extra,
  alignTop = false,
}: {
  form: Form;
  errorId: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  control: React.ReactNode;
  button: React.ReactNode;
  preview?: React.ReactNode;
  extra?: React.ReactNode;
  /** No telemóvel, o Guardar alinha com a primeira linha do campo (campo em duas linhas). */
  alignTop?: boolean;
}) {
  return (
    <form
      onSubmit={onSubmit}
      onInput={form.markEdited}
      onChange={form.markEdited}
      className="grid content-start gap-2"
      noValidate
    >
      <div className={cn("flex flex-wrap items-center gap-x-3", alignTop && "max-sm:items-start")}>
        {/* Largura fixa: o Guardar fica na mesma coluna em todas as linhas. */}
        <div className="flex min-w-0 flex-1 items-center sm:w-64 sm:flex-none">{control}</div>
        {button}
        {/* No telemóvel, o estado passa para a linha de baixo em vez de apertar o campo;
            vazio, não ocupa espaço (o role="status" fica sempre montado). */}
        <div className="max-sm:basis-full max-sm:has-[:not(:empty)]:pt-2">
          <RowStatus form={form} />
        </div>
      </div>
      {form.error && <FieldError id={errorId} message={form.error} />}
      {preview && <p className="text-steel text-[13px]/[18px] tabular-nums">{preview}</p>}
      {extra}
    </form>
  );
}

function errorProps(form: Form, errorId: string) {
  const invalid = Boolean(form.error);
  return {
    "aria-invalid": invalid || undefined,
    "aria-describedby": invalid ? errorId : undefined,
  } as const;
}

/**
 * Pede confirmação antes de guardar: o botão Guardar abre o ConfirmDialog só
 * quando o valor é válido e diferente do guardado; senão envia logo (o servidor
 * devolve o erro, por baixo do campo).
 */
function useConfirmedSubmit(
  form: Form,
  needsConfirm: () => boolean,
  value: string,
  triggerRef: React.RefObject<HTMLButtonElement | null>,
) {
  const confirmed = useRef(false);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!confirmed.current && needsConfirm()) {
      triggerRef.current?.click();
      return;
    }
    confirmed.current = false;
    form.submit(value);
  };

  const onTriggerClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (needsConfirm()) return; // abre a confirmação
    event.preventDefault();
    form.submit(value);
  };

  const onConfirm = () => {
    confirmed.current = false;
    form.submit(value);
  };

  return { onSubmit, onTriggerClick, onConfirm };
}

// ── IVA ────────────────────────────────────────────────────────────────────

function priceWithVat(example: PriceExample, percent: string): string | null {
  const parsed = parseSettingInput("vat_rate", percent);
  if (!parsed.ok) return null;
  const rate = parseDecimal(parsed.value.rate);
  return formatEuros(example.netCents + vatCents(example.netCents, rate));
}

export function VatForm({ initial, example }: { initial: string; example: PriceExample | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const form = useSettingForm("vat_rate", initial, inputRef);
  const [value, setValue] = useState(initial);
  const id = settingInputId("vat_rate");
  const errorId = `${id}-erro`;

  const typed = value.trim().replace(/\s*%$/, "");
  const changed = parseSettingInput("vat_rate", typed).ok && typed !== form.saved;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const confirm = useConfirmedSubmit(form, () => changed, value, triggerRef);

  const before = example ? priceWithVat(example, form.saved) : null;
  const after = example ? priceWithVat(example, typed) : null;

  let preview: React.ReactNode = null;
  if (example && before) {
    preview =
      changed && after ? (
        <>
          Com {typed} %: {example.label} passa de {before} para{" "}
          <span className="text-ink font-medium">{after}</span> com IVA.
        </>
      ) : (
        <>
          Na loja hoje: {example.label} custa {before} com IVA.
        </>
      );
  }

  return (
    <RowForm
      form={form}
      errorId={errorId}
      onSubmit={confirm.onSubmit}
      preview={preview}
      control={
        <UnitInput
          ref={inputRef}
          id={id}
          name="value"
          unit="%"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          wrapperClassName="w-full"
          {...errorProps(form, errorId)}
        />
      }
      button={
        <ConfirmDialog
          tone="default"
          title={`Mudar o IVA de ${form.saved} % para ${typed} %?`}
          confirmLabel={`Mudar para ${typed} %`}
          onConfirm={confirm.onConfirm}
          trigger={
            <Button
              ref={triggerRef}
              type="button"
              variant="outline"
              pending={form.pending}
              onClick={confirm.onTriggerClick}
            >
              Guardar
            </Button>
          }
        >
          <p>Os preços da loja passam a ser calculados com {typed} % de IVA.</p>
          {example && before && after && (
            <p className="text-ink tabular-nums">
              {example.label}: {before} → <span className="font-semibold">{after}</span>
            </p>
          )}
          <p>
            Encomendas já feitas não mudam. Orçamentos já guardados mantêm a taxa com que foram
            feitos até expirarem.
          </p>
        </ConfirmDialog>
      }
    />
  );
}

// ── Validade dos orçamentos ────────────────────────────────────────────────

function dateAfter(now: string, days: string): string | null {
  if (!/^\d{1,3}$/.test(days.trim())) return null;
  return formatDate(new Date(new Date(now).getTime() + Number(days) * DAY));
}

export function ValidityForm({ initial, now }: { initial: string; now: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const form = useSettingForm("quote_validity_days", initial, inputRef);
  const [value, setValue] = useState(initial);
  const id = settingInputId("quote_validity_days");
  const errorId = `${id}-erro`;

  const typed = value.trim();
  const changed = parseSettingInput("quote_validity_days", typed).ok && typed !== form.saved;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const confirm = useConfirmedSubmit(form, () => changed, value, triggerRef);
  const until = parseSettingInput("quote_validity_days", typed).ok ? dateAfter(now, typed) : null;

  return (
    <RowForm
      form={form}
      errorId={errorId}
      onSubmit={confirm.onSubmit}
      preview={until && <>Um orçamento guardado hoje mantém o preço até {until}.</>}
      control={
        <UnitInput
          ref={inputRef}
          id={id}
          name="value"
          unit="dias"
          inputMode="numeric"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          wrapperClassName="w-full"
          className="pr-14"
          {...errorProps(form, errorId)}
        />
      }
      button={
        <ConfirmDialog
          tone="default"
          title={`Mudar a validade dos orçamentos de ${form.saved} para ${typed} dias?`}
          confirmLabel={`Mudar para ${typed} dias`}
          onConfirm={confirm.onConfirm}
          trigger={
            <Button
              ref={triggerRef}
              type="button"
              variant="outline"
              pending={form.pending}
              onClick={confirm.onTriggerClick}
            >
              Guardar
            </Button>
          }
        >
          <p>
            Os orçamentos guardados a partir de agora mantêm o preço durante {typed} dias
            {until ? ` (um orçamento de hoje fica válido até ${until})` : ""}. Depois disso, o preço
            é recalculado com os custos do momento.
          </p>
          <p>Os orçamentos que já estão guardados mantêm o prazo com que foram feitos.</p>
        </ConfirmDialog>
      }
    />
  );
}

// ── Expiração das encomendas por pagar ─────────────────────────────────────

const DEFAULT_EXPIRY_DAYS = "7";

export function ExpiryForm({ initial, now }: { initial: string; now: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const form = useSettingForm("order_expiry_days", initial, inputRef);
  const [enabled, setEnabled] = useState(initial !== "");
  const [days, setDays] = useState(initial || DEFAULT_EXPIRY_DAYS);
  const id = settingInputId("order_expiry_days");
  const daysId = `${id}-dias`;
  const errorId = `${id}-erro`;
  const value = enabled ? days.trim() : "";
  const until = enabled ? dateAfter(now, days) : null;

  return (
    <RowForm
      form={form}
      errorId={errorId}
      onSubmit={(event) => {
        event.preventDefault();
        form.submit(value);
      }}
      preview={
        enabled
          ? until && <>Uma encomenda feita hoje que não seja paga expira a {until}.</>
          : "As encomendas por pagar ficam à espera até as mudar à mão."
      }
      alignTop
      control={
        // Telemóvel: o Switch numa linha (à altura do Guardar) e «ao fim de [7] dias» por baixo.
        // A partir de sm cabe tudo numa linha.
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span className="flex min-h-10 items-center gap-3 pointer-coarse:min-h-11">
            <Switch
              id={id}
              checked={enabled}
              onCheckedChange={(checked) => {
                setEnabled(checked);
                form.markEdited();
              }}
            />
            {!enabled && (
              <span className="text-ink-soft text-sm" aria-hidden>
                Desligado
              </span>
            )}
          </span>
          {enabled && (
            <span className="text-ink-soft flex items-center gap-2 text-sm">
              <label htmlFor={daysId} className="whitespace-nowrap">
                ao fim de
              </label>
              <UnitInput
                ref={inputRef}
                id={daysId}
                unit="dias"
                inputMode="numeric"
                value={days}
                onChange={(event) => setDays(event.target.value)}
                wrapperClassName="w-28 pointer-coarse:w-32"
                className="pr-14"
                {...errorProps(form, errorId)}
              />
            </span>
          )}
        </div>
      }
      button={
        <Button type="submit" variant="outline" pending={form.pending}>
          Guardar
        </Button>
      }
    />
  );
}

// ── Email dos avisos ───────────────────────────────────────────────────────

export function NotifyEmailForm({ initial }: { initial: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const form = useSettingForm("orders_notify_email", initial, inputRef);
  const [value, setValue] = useState(initial);
  const [sending, startSending] = useTransition();
  const { toast } = useToast();
  const id = settingInputId("orders_notify_email");
  const errorId = `${id}-erro`;
  const hintId = useId();

  const sendTest = () =>
    startSending(async () => {
      const result = await sendTestEmailAction();
      toast({ tone: result.ok ? "ok" : "danger", message: result.message });
    });

  return (
    <RowForm
      form={form}
      errorId={errorId}
      onSubmit={(event) => {
        event.preventDefault();
        form.submit(value);
      }}
      control={
        <input
          ref={inputRef}
          id={id}
          name="value"
          type="email"
          autoComplete="email"
          spellCheck={false}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className={cn(fieldClass, "w-full")}
          {...errorProps(form, errorId)}
        />
      }
      button={
        <Button type="submit" variant="outline" pending={form.pending}>
          Guardar
        </Button>
      }
      extra={
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Button
            type="button"
            variant="link"
            onClick={sendTest}
            pending={sending}
            pendingLabel="A enviar…"
            aria-describedby={hintId}
            className="text-[13px]"
          >
            <Send aria-hidden className="size-3.5" strokeWidth={1.75} />
            Enviar email de teste
          </Button>
          <span id={hintId} className="text-steel-light text-xs">
            Vai para o endereço guardado{form.dirty ? " (guarde primeiro o novo)" : ""}.
          </span>
        </div>
      }
    />
  );
}
