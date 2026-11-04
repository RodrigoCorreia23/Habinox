"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, startTransition, useActionState, useState } from "react";
import { type CheckoutState, placeOrderAction } from "@/app/[locale]/(loja)/checkout/actions";
import { formatEuros } from "@/lib/money";

const inputClass =
  "bg-night-surface border-night-line-strong focus-visible:outline-night-text aria-invalid:border-night-error-border h-12 w-full rounded-[2px] border px-4 text-base outline-offset-3 focus-visible:outline-2 aria-invalid:border-2";

function Field({
  name,
  label,
  error,
  hint,
  autoComplete,
  inputMode,
  defaultValue,
  required = true,
  className,
}: {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  autoComplete?: string;
  inputMode?: "tel" | "numeric" | "text";
  defaultValue?: string;
  required?: boolean;
  className?: string;
}) {
  const id = `f-${name.replace(".", "-")}`;
  return (
    <div className={`grid content-start gap-2 ${className ?? ""}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].join(" ").trim() || undefined
        }
        className={inputClass}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-night-faint text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-night-error text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

function AddressFields({
  prefix,
  errors,
  section,
}: {
  prefix: "billing" | "shipping";
  errors: Record<string, string>;
  section: "billing" | "shipping";
}) {
  const t = useTranslations("Shop.checkout");
  const auto = section === "billing" ? "billing" : "shipping";
  return (
    <div className="grid gap-5 sm:grid-cols-6">
      <Field
        name={`${prefix}.name`}
        label={t("name")}
        error={errors[`${prefix}.name`]}
        autoComplete={`${auto} name`}
        className="sm:col-span-6"
      />
      <Field
        name={`${prefix}.line1`}
        label={t("line1")}
        error={errors[`${prefix}.line1`]}
        autoComplete={`${auto} address-line1`}
        className="sm:col-span-6"
      />
      <Field
        name={`${prefix}.line2`}
        label={t("line2")}
        required={false}
        autoComplete={`${auto} address-line2`}
        className="sm:col-span-6"
      />
      <Field
        name={`${prefix}.postalCode`}
        label={t("postalCode")}
        error={errors[`${prefix}.postalCode`]}
        autoComplete={`${auto} postal-code`}
        inputMode="numeric"
        className="sm:col-span-2"
      />
      <Field
        name={`${prefix}.city`}
        label={t("city")}
        error={errors[`${prefix}.city`]}
        autoComplete={`${auto} address-level2`}
        className="sm:col-span-4"
      />
      <p className="text-night-faint text-xs sm:col-span-6">{t("country")}</p>
    </div>
  );
}

export function CheckoutForm({ locale, totalCents }: { locale: string; totalCents: number }) {
  const t = useTranslations("Shop.checkout");
  const [state, action, pending] = useActionState<CheckoutState, FormData>(
    placeOrderAction.bind(null, locale),
    null,
  );
  const [sameShipping, setSameShipping] = useState(true);
  const errors = state?.fieldErrors ?? {};

  // Sem o reset automático do React 19: com erro, o cliente não perde o que escreveu.
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  };

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-14">
      <input type="hidden" name="expectedTotalCents" value={totalCents} />
      <section aria-labelledby="contacto" className="grid gap-5">
        <h2 id="contacto" className="font-display text-3xl">
          {t("contact")}
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            name="phone"
            label={t("phone")}
            error={errors.phone}
            autoComplete="tel"
            inputMode="tel"
          />
          <Field
            name="nif"
            label={t("nif")}
            error={errors.nif}
            hint={t("nifHint")}
            inputMode="numeric"
            required={false}
          />
        </div>
      </section>

      <section aria-labelledby="faturacao" className="grid gap-5">
        <h2 id="faturacao" className="font-display text-3xl">
          {t("billing")}
        </h2>
        <AddressFields prefix="billing" errors={errors} section="billing" />
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="sameShipping"
            checked={sameShipping}
            onChange={(event) => setSameShipping(event.target.checked)}
            className="accent-amber size-5"
          />
          {t("sameShipping")}
        </label>
      </section>

      {!sameShipping && (
        <section aria-labelledby="entrega" className="grid gap-5">
          <h2 id="entrega" className="font-display text-3xl">
            {t("shipping")}
          </h2>
          <AddressFields prefix="shipping" errors={errors} section="shipping" />
        </section>
      )}

      <section className="grid gap-2">
        <label htmlFor="f-notes" className="text-sm font-medium">
          {t("notes")}
        </label>
        <textarea
          id="f-notes"
          name="notes"
          rows={3}
          maxLength={1000}
          aria-describedby="f-notes-hint"
          className="bg-night-surface border-night-line-strong focus-visible:outline-night-text w-full rounded-[2px] border px-4 py-3 text-base outline-offset-3 focus-visible:outline-2"
        />
        <p id="f-notes-hint" className="text-night-faint text-xs">
          {t("notesHint")}
        </p>
      </section>

      <section className="border-night-line grid gap-4 border-t pt-8">
        {(["acceptMeasures", "acceptTerms"] as const).map((name) => (
          <div key={name}>
            <label className="flex items-start gap-3 text-sm leading-relaxed">
              <input
                type="checkbox"
                name={name}
                aria-invalid={errors[name] ? true : undefined}
                className="accent-amber mt-0.5 size-5 shrink-0"
              />
              {t(name)}
            </label>
            {errors[name] && <p className="text-night-error mt-1 ml-8 text-xs">{errors[name]}</p>}
          </div>
        ))}
      </section>

      <div className="grid gap-3">
        {state?.error && (
          <p role="alert" className="text-night-error text-sm">
            {t(`errors.${state.error}`, { products: state.products?.join(", ") ?? "" })}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="bg-amber text-on-amber hover:bg-amber-hover focus-visible:outline-night-text min-h-[60px] w-full px-6 text-base font-medium outline-offset-3 focus-visible:outline-2 disabled:opacity-60"
        >
          {pending ? t("submitting") : t("submit", { amount: formatEuros(totalCents) })}
        </button>
        <p className="text-night-faint text-xs">{t("paymentNote")}</p>
      </div>
    </form>
  );
}
