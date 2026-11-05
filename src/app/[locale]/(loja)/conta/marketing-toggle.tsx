"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { setMarketingAction } from "./actions";

/** Liga ou desliga o contacto comercial; o estado vem do servidor (último consentimento). */
export function MarketingToggle({ granted }: { granted: boolean }) {
  const t = useTranslations("Account.privacy");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  return (
    <label className="flex max-w-2xl items-start gap-3 text-base leading-relaxed">
      <input
        type="checkbox"
        checked={granted}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.checked;
          startTransition(() => setMarketingAction(locale, next));
        }}
        className="accent-amber mt-1 size-5 shrink-0"
      />
      <span>
        {t("marketing")}
        <span role="status" className="text-night-faint block text-sm">
          {pending ? t("saving") : granted ? t("marketingOn") : t("marketingOff")}
        </span>
      </span>
    </label>
  );
}
