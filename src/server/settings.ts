/**
 * Parâmetros de negócio guardados na tabela `settings` (nunca constantes no código).
 * Cada chave tem o seu esquema; um valor em falta ou inválido é erro de configuração.
 */
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { settings } from "@/db/schema";
import { parseDecimal, type Decimal } from "@/lib/money";

const decimalText = z.string().regex(/^\d+(\.\d{1,4})?$/);

export const SETTING_SCHEMAS = {
  /** Taxa de IVA em fração ("0.2300"). Cada encomenda guarda a taxa usada. */
  vat_rate: z.object({ rate: decimalText }),
  /** Dias durante os quais um orçamento guardado mantém o preço. */
  quote_validity_days: z.object({ days: z.number().int().min(1).max(365) }),
  /** Para onde vão os avisos de encomenda nova. */
  orders_notify_email: z.object({ email: z.email() }),
} as const;

export type SettingKey = keyof typeof SETTING_SCHEMAS;

/** Valores por omissão gravados pelo seed (só se a chave não existir). */
export const SETTING_DEFAULTS: { [K in SettingKey]: z.infer<(typeof SETTING_SCHEMAS)[K]> } = {
  vat_rate: { rate: "0.2300" },
  quote_validity_days: { days: 30 },
  orders_notify_email: { email: "geral@habinox.pt" },
};

export async function getSetting<K extends SettingKey>(key: K) {
  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  if (!row) throw new Error(`Parâmetro em falta em settings: ${key}`);
  return SETTING_SCHEMAS[key].parse(row.value) as z.infer<(typeof SETTING_SCHEMAS)[K]>;
}

export async function getVatRate(): Promise<Decimal> {
  return parseDecimal((await getSetting("vat_rate")).rate);
}
