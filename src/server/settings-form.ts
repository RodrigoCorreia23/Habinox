/**
 * Página "Parâmetros" do backoffice: converte o que o Bruno escreve em cada
 * campo no valor guardado em `settings` (e o inverso, para mostrar). Puro.
 */
import { fractionToPercent, percentToFraction } from "@/lib/percent";
import type { SettingValues } from "./settings";

export const EDITABLE_SETTINGS = [
  "vat_rate",
  "quote_validity_days",
  "order_expiry_days",
  "orders_notify_email",
] as const;

export type EditableSetting = (typeof EDITABLE_SETTINGS)[number];

/** Teto da taxa de IVA aceite no backoffice (30 %), em fração. */
const VAT_MAX_FRACTION = 0.3;

export type SettingParse<K extends EditableSetting> =
  { ok: true; value: SettingValues[K] } | { ok: false; message: string };

function days(input: string, min: number, max: number): number | null {
  if (!/^\d{1,3}$/.test(input)) return null;
  const value = Number(input);
  return value >= min && value <= max ? value : null;
}

export function parseSettingInput<K extends EditableSetting>(key: K, raw: string): SettingParse<K> {
  const input = raw.trim();
  const ok = (value: SettingValues[EditableSetting]) => ({ ok: true, value }) as SettingParse<K>;
  switch (key) {
    case "vat_rate": {
      const parsed = percentToFraction(input);
      // Nenhuma taxa de IVA em Portugal passa de 23 %: acima de 30 % é engano de escrita.
      if (!parsed.ok || Number(parsed.fraction) > VAT_MAX_FRACTION) {
        return { ok: false, message: "Escreva um número entre 0 e 30." };
      }
      return ok({ rate: parsed.fraction });
    }
    case "quote_validity_days": {
      const value = days(input, 1, 365);
      if (value === null) return { ok: false, message: "Escreva um número de dias entre 1 e 365." };
      return ok({ days: value });
    }
    case "order_expiry_days": {
      if (input === "") return ok({ days: null });
      const value = days(input, 1, 90);
      if (value === null) {
        return { ok: false, message: "Escreva um número de dias entre 1 e 90." };
      }
      return ok({ days: value });
    }
    case "orders_notify_email": {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input) || input.length > 254) {
        return { ok: false, message: "Escreva um email válido, por exemplo geral@habinox.pt." };
      }
      return ok({ email: input.toLowerCase() });
    }
  }
  return { ok: false, message: "Parâmetro desconhecido" };
}

/** Valor guardado → texto do campo. */
export function settingToInput(key: EditableSetting, value: unknown): string {
  const v = value as Record<string, unknown>;
  switch (key) {
    case "vat_rate":
      return fractionToPercent(String(v.rate));
    case "quote_validity_days":
    case "order_expiry_days":
      return v.days === null || v.days === undefined ? "" : String(v.days);
    case "orders_notify_email":
      return String(v.email ?? "");
  }
  return "";
}
