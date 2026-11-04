"use client";

/**
 * Configurador da loja. As regras (o que se vê, o que é obrigatório, que valores
 * existem) correm aqui com lib/options; o preço vem sempre do servidor, porque
 * os custos e as margens nunca saem de lá.
 */
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { addToCartAction } from "@/app/[locale]/(loja)/carrinho/actions";
import { quoteAction } from "@/app/[locale]/(loja)/loja/actions";
import { Link } from "@/i18n/navigation";
import { formatEuros } from "@/lib/money";
import { resolveConfig } from "@/lib/options";
import type { AddResult } from "@/server/store/cart";
import type { ConfiguratorData, ConfiguratorOption, QuoteResult } from "@/server/store/catalog";

const UNIT_FACTOR = { mm: 1, cm: 10, m: 1000 } as const;
const numberFormat = new Intl.NumberFormat("pt-PT", {
  useGrouping: "always",
  maximumFractionDigits: 3,
});

type Raw = Record<string, string | boolean>;

function initialRaw(options: ConfiguratorOption[]): Raw {
  const raw: Raw = {};
  for (const option of options) {
    if (option.type === "boolean") raw[option.key] = false;
    else if (option.type === "choice") {
      raw[option.key] =
        (option.values.find((value) => value.isDefault) ?? option.values[0])?.key ?? "";
    } else raw[option.key] = "";
  }
  return raw;
}

/** Texto do campo → valor do motor (medidas em mm inteiros). */
function toInput(options: ConfiguratorOption[], raw: Raw): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  for (const option of options) {
    const value = raw[option.key];
    if (option.type === "boolean") input[option.key] = value === true;
    else if (option.type === "choice") input[option.key] = value || undefined;
    else {
      const text = String(value ?? "")
        .trim()
        .replace(/\s/g, "")
        .replace(",", ".");
      if (text === "") continue;
      const number = Number(text);
      if (!Number.isFinite(number)) input[option.key] = text;
      else
        input[option.key] =
          option.type === "dimension" ? Math.round(number * UNIT_FACTOR[option.unit]) : number;
    }
  }
  return input;
}

const inDisplayUnit = (mm: number, unit: ConfiguratorOption["unit"]) =>
  numberFormat.format(mm / UNIT_FACTOR[unit]);

export function Configurator({
  productId,
  locale,
  data,
  validityDays,
}: {
  productId: string;
  locale: string;
  data: ConfiguratorData;
  validityDays: number;
}) {
  const t = useTranslations("Shop.configurator");
  const [raw, setRaw] = useState<Raw>(() => initialRaw(data.options));
  const [quote, setQuote] = useState<QuoteResult | null | "error">(null);
  const [pending, setPending] = useState(false);
  const request = useRef(0);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState<AddResult | null>(null);

  // Escolhas que deixaram de estar disponíveis passam ao valor por omissão (com aviso).
  const { resolved, changed, input } = useMemo(() => {
    let current = { ...raw };
    let result = resolveConfig(data.definitions, data.rules, toInput(data.options, current));
    const changes: { option: string; value: string }[] = [];
    for (const option of data.options) {
      const allowed = result.state[option.key]?.allowed;
      const value = current[option.key];
      if (option.type !== "choice" || !allowed || typeof value !== "string" || value === "")
        continue;
      if (!allowed.includes(value) && allowed.length > 0) {
        const fallback =
          option.values.find(
            (candidate) => candidate.isDefault && allowed.includes(candidate.key),
          ) ?? option.values.find((candidate) => allowed.includes(candidate.key));
        if (fallback) {
          current = { ...current, [option.key]: fallback.key };
          changes.push({ option: option.name, value: fallback.label });
          result = resolveConfig(data.definitions, data.rules, toInput(data.options, current));
        }
      }
    }
    return { resolved: result, changed: changes, input: toInput(data.options, current) };
  }, [raw, data]);

  const missingMeasures = data.options.some(
    (option) =>
      resolved.state[option.key]?.visible &&
      (option.type === "dimension" || option.type === "number") &&
      option.required &&
      String(raw[option.key] ?? "").trim() === "",
  );
  const fieldErrors = new Map(
    resolved.errors
      .filter((error) => error.option && !(error.code === "required" && missingMeasures))
      .map((error) => [error.option!, error.code]),
  );
  const forbidden = resolved.errors.filter((error) => !error.option).map((error) => error.message);
  const valid = resolved.errors.length === 0;
  const inputKey = JSON.stringify(input);

  // Preço ao vivo, com um pequeno atraso para não pedir a cada tecla.
  useEffect(() => {
    if (!valid) return;
    const id = ++request.current;
    const timer = setTimeout(async () => {
      setPending(true);
      const result = await quoteAction(productId, locale, JSON.parse(inputKey)).catch(() => null);
      if (id !== request.current) return;
      setQuote(result ?? "error");
      setPending(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [valid, inputKey, productId, locale]);

  const set = (key: string, value: string | boolean) => {
    setAdded(null);
    setRaw((current) => ({ ...current, [key]: value }));
  };
  const dimensions = data.options.filter(
    (option) => option.type === "dimension" && resolved.state[option.key]?.visible,
  );
  const width =
    typeof resolved.values[dimensions[0]?.key ?? ""] === "number"
      ? (resolved.values[dimensions[0]!.key] as number)
      : null;
  const height =
    typeof resolved.values[dimensions[1]?.key ?? ""] === "number"
      ? (resolved.values[dimensions[1]!.key] as number)
      : null;

  const showQuote = valid && quote !== null && quote !== "error" && quote.ok;
  let status: string | null = null;
  if (forbidden.length > 0) status = forbidden.join(" ");
  else if (missingMeasures) status = t("fillIn");
  else if (!valid) status = t("fixErrors");
  else if (quote === "error") status = t("error");
  else if (quote && !quote.ok) status = quote.unavailable ? t("unavailable") : t("fixErrors");

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-14">
      <div className="lg:col-span-7">
        <div className="lg:sticky lg:top-8">
          <Drawing
            width={width}
            height={height}
            widthLabel={
              dimensions[0]
                ? `${inDisplayUnit(width ?? 0, dimensions[0].unit)} ${dimensions[0].unit}`
                : ""
            }
            heightLabel={
              dimensions[1]
                ? `${inDisplayUnit(height ?? 0, dimensions[1].unit)} ${dimensions[1].unit}`
                : ""
            }
            label={t("drawing")}
          />
        </div>
      </div>

      <div className="lg:col-span-5">
        <div aria-live="polite" className="border-night-line border-b pb-8">
          <p className="text-night-faint font-mono text-xs tracking-[0.08em] uppercase">
            {t("price")}
          </p>
          <p
            className={`mt-2 font-mono text-[44px] leading-none tabular-nums ${pending ? "opacity-60" : ""}`}
          >
            {showQuote ? formatEuros(quote.totalCents) : "—"}
          </p>
          {showQuote ? (
            <p className="text-night-muted mt-3 text-sm">
              {t("vatIncluded")} ·{" "}
              <span className="font-mono">
                {t("withoutVat", { amount: formatEuros(quote.netCents) })}
              </span>
            </p>
          ) : (
            status && <p className="text-night-muted mt-3 text-sm">{status}</p>
          )}
          {showQuote && quote.facts.length > 0 && (
            <p className="text-night-soft mt-3 font-mono text-sm">
              {quote.facts
                .map((fact) => `${fact.label}: ${numberFormat.format(fact.value)}`)
                .join(" · ")}
            </p>
          )}
          {changed.map((change) => (
            <p key={change.option} className="text-amber mt-3 text-sm">
              {t("changed", { option: change.option, value: change.value })}
            </p>
          ))}
        </div>

        <div className="divide-night-line divide-y">
          {data.options.map((option) => {
            const state = resolved.state[option.key];
            if (!state?.visible) return null;
            const error = fieldErrors.get(option.key);
            return (
              <OptionField
                key={option.key}
                option={option}
                value={raw[option.key] ?? ""}
                allowed={state.allowed}
                required={state.required}
                error={error ? t(`errors.${error}`) : null}
                onChange={(value) => set(option.key, value)}
              />
            );
          })}
        </div>

        <div className="border-night-line border-t pt-8">
          <button
            type="button"
            disabled={!showQuote || adding}
            onClick={async () => {
              setAdding(true);
              setAdded(null);
              const result = await addToCartAction(productId, locale, input, 1).catch(() => null);
              setAdded(result ?? { ok: false, reason: "invalid" });
              setAdding(false);
            }}
            className="bg-amber text-on-amber hover:bg-amber-hover focus-visible:outline-night-text min-h-[60px] w-full px-6 text-base font-medium outline-offset-3 focus-visible:outline-2 disabled:opacity-50"
          >
            {adding ? t("adding") : t("addToCart")}
            {showQuote && !adding ? ` · ${formatEuros(quote.totalCents)}` : ""}
          </button>
          <p role="status" className="mt-3 text-sm">
            {added?.ok ? (
              <>
                {t("added")}{" "}
                <Link href="/carrinho" className="text-amber underline underline-offset-4">
                  {t("viewCart")}
                </Link>
              </>
            ) : added ? (
              <span className="text-night-error">{t(`addFailed.${added.reason}`)}</span>
            ) : (
              <span className="text-night-faint text-xs">
                {t("priceKept", { days: validityDays })}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function OptionField({
  option,
  value,
  allowed,
  required,
  error,
  onChange,
}: {
  option: ConfiguratorOption;
  value: string | boolean;
  allowed?: string[];
  required: boolean;
  error: string | null;
  onChange: (value: string | boolean) => void;
}) {
  const t = useTranslations("Shop.configurator");
  const id = `opt-${option.key}`;
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;

  if (option.type === "dimension" || option.type === "number") {
    const unit = option.type === "dimension" ? option.unit : "";
    const show = (mm: number) =>
      option.type === "dimension" ? inDisplayUnit(mm, option.unit) : numberFormat.format(mm);
    const range =
      option.min !== null && option.max !== null
        ? t("range", { min: show(option.min), max: show(option.max), unit })
        : option.min !== null
          ? t("rangeMin", { min: show(option.min), unit })
          : option.max !== null
            ? t("rangeMax", { max: show(option.max), unit })
            : null;
    return (
      <div className="grid gap-2 py-6">
        <label htmlFor={id} className="text-sm font-medium">
          {option.name}
        </label>
        <div className="relative max-w-xs">
          <input
            id={id}
            inputMode="decimal"
            autoComplete="off"
            value={String(value)}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={
              [range || option.help ? helpId : "", error ? errorId : ""].join(" ").trim() ||
              undefined
            }
            className="bg-night-surface border-night-line-strong focus-visible:outline-night-text aria-invalid:border-night-error-border h-12 w-full rounded-[2px] border px-4 pr-14 font-mono text-lg tabular-nums outline-offset-3 focus-visible:outline-2 aria-invalid:border-2"
          />
          {unit && (
            <span className="text-night-faint pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 font-mono text-sm">
              {unit}
            </span>
          )}
        </div>
        {(range || option.help) && (
          <p id={helpId} className="text-night-faint text-xs">
            {[range, option.help].filter(Boolean).join(" · ")}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-night-error text-xs">
            {error}
          </p>
        )}
      </div>
    );
  }

  if (option.type === "boolean") {
    return (
      <fieldset className="grid gap-3 py-6">
        <legend className="text-sm font-medium">{option.name}</legend>
        <div className="flex gap-2">
          {[true, false].map((choice) => (
            <button
              key={String(choice)}
              type="button"
              aria-pressed={value === choice}
              onClick={() => onChange(choice)}
              className="border-night-line-strong aria-pressed:bg-night-text aria-pressed:text-on-amber aria-pressed:border-night-text focus-visible:outline-night-text min-h-11 rounded-full border px-5 text-sm outline-offset-3 focus-visible:outline-2"
            >
              {choice ? t("yes") : t("no")}
            </button>
          ))}
        </div>
        {option.help && <p className="text-night-faint text-xs">{option.help}</p>}
      </fieldset>
    );
  }

  const values = option.values.filter((candidate) => !allowed || allowed.includes(candidate.key));
  const swatches = option.display === "swatches";
  return (
    <fieldset className="grid gap-3 py-6" aria-describedby={error ? errorId : undefined}>
      <legend className="text-sm font-medium">
        {option.name}
        {swatches && value && (
          <span className="text-night-muted ml-2 font-normal">
            {values.find((candidate) => candidate.key === value)?.label}
          </span>
        )}
      </legend>
      {option.display === "list" ? (
        <select
          aria-label={option.name}
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          className="bg-night-surface border-night-line-strong h-12 max-w-sm rounded-[2px] border px-3 text-sm"
        >
          {!required && <option value="">{t("none")}</option>}
          {values.map((candidate) => (
            <option key={candidate.key} value={candidate.key}>
              {candidate.label}
            </option>
          ))}
        </select>
      ) : (
        <div className="flex flex-wrap gap-2">
          {!required && !swatches && (
            <button
              type="button"
              aria-pressed={value === ""}
              onClick={() => onChange("")}
              className="border-night-line-strong aria-pressed:bg-night-text aria-pressed:text-on-amber aria-pressed:border-night-text focus-visible:outline-night-text min-h-11 rounded-full border px-5 text-sm outline-offset-3 focus-visible:outline-2"
            >
              {t("none")}
            </button>
          )}
          {values.map((candidate) =>
            swatches ? (
              <button
                key={candidate.key}
                type="button"
                aria-pressed={value === candidate.key}
                aria-label={candidate.label}
                title={candidate.label}
                onClick={() => onChange(candidate.key)}
                style={{ backgroundColor: candidate.swatchHex ?? "#706960" }}
                className="border-night-line-strong aria-pressed:shadow-[0_0_0_3px_var(--color-night),0_0_0_5px_var(--color-amber)] focus-visible:outline-night-text size-11 rounded-full border outline-offset-3 focus-visible:outline-2"
              />
            ) : (
              <button
                key={candidate.key}
                type="button"
                aria-pressed={value === candidate.key}
                onClick={() => onChange(candidate.key)}
                className="border-night-line-strong aria-pressed:bg-night-text aria-pressed:text-on-amber aria-pressed:border-night-text focus-visible:outline-night-text min-h-11 rounded-full border px-5 text-sm outline-offset-3 focus-visible:outline-2"
              >
                {candidate.label}
              </button>
            ),
          )}
        </div>
      )}
      {option.help && <p className="text-night-faint text-xs">{option.help}</p>}
      {error && (
        <p id={errorId} className="text-night-error text-xs">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** Desenho cotado (o único bloco claro da loja): as duas primeiras medidas, à escala. */
function Drawing({
  width,
  height,
  widthLabel,
  heightLabel,
  label,
}: {
  width: number | null;
  height: number | null;
  widthLabel: string;
  heightLabel: string;
  label: string;
}) {
  const W = 640;
  const H = 480;
  const pad = 96;
  const w = width ?? 4000;
  const h = height ?? 1800;
  const scale = Math.min((W - pad * 2) / w, (H - pad * 2) / h);
  const rw = w * scale;
  const rh = h * scale;
  const x = (W - rw) / 2;
  const y = (H - rh) / 2;
  const known = width !== null || height !== null;
  return (
    <figure className="bg-paper aspect-[4/3] w-full">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="h-full w-full">
        <rect x={x} y={y} width={rw} height={rh} fill="none" stroke="#15120E" strokeWidth={2} />
        {known && (
          <g
            stroke="var(--color-dim)"
            fill="var(--color-dim)"
            fontFamily="var(--font-plex-mono)"
            fontSize={24}
          >
            {width !== null && (
              <>
                <line x1={x} y1={y + rh + 28} x2={x + rw} y2={y + rh + 28} strokeWidth={1} />
                <line x1={x} y1={y + rh + 20} x2={x} y2={y + rh + 36} strokeWidth={1} />
                <line x1={x + rw} y1={y + rh + 20} x2={x + rw} y2={y + rh + 36} strokeWidth={1} />
                <text x={x + rw / 2} y={y + rh + 62} textAnchor="middle" stroke="none">
                  {widthLabel}
                </text>
              </>
            )}
            {height !== null && (
              <>
                <line x1={x - 28} y1={y} x2={x - 28} y2={y + rh} strokeWidth={1} />
                <line x1={x - 36} y1={y} x2={x - 20} y2={y} strokeWidth={1} />
                <line x1={x - 36} y1={y + rh} x2={x - 20} y2={y + rh} strokeWidth={1} />
                <text
                  x={x - 46}
                  y={y + rh / 2}
                  textAnchor="middle"
                  stroke="none"
                  transform={`rotate(-90 ${x - 46} ${y + rh / 2})`}
                >
                  {heightLabel}
                </text>
              </>
            )}
          </g>
        )}
      </svg>
    </figure>
  );
}
