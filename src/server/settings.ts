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
} as const;

export type SettingKey = keyof typeof SETTING_SCHEMAS;

/** Valores por omissão gravados pelo seed (só se a chave não existir). */
export const SETTING_DEFAULTS: { [K in SettingKey]: z.infer<(typeof SETTING_SCHEMAS)[K]> } = {
  vat_rate: { rate: "0.2300" },
};

export async function getSetting<K extends SettingKey>(key: K) {
  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  if (!row) throw new Error(`Parâmetro em falta em settings: ${key}`);
  return SETTING_SCHEMAS[key].parse(row.value) as z.infer<(typeof SETTING_SCHEMAS)[K]>;
}

export async function getVatRate(): Promise<Decimal> {
  return parseDecimal((await getSetting("vat_rate")).rate);
}
