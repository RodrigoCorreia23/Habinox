/**
 * Conversões para o backoffice: chaves técnicas a partir do nome e
 * parâmetros dos valores escritos como texto ("valor=0,12; lados=2").
 */
import { slugify } from "@/lib/slug";

export const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

/** "Motorização" → "motorizacao"; "Cor RAL" → "cor_ral"; "2 folhas" → "v_2_folhas". */
export function keyFromName(name: string): string {
  const key = slugify(name).replace(/-/g, "_").slice(0, 40).replace(/_+$/, "");
  if (key === "") return "";
  return /^[a-z]/.test(key) ? key : `v_${key}`;
}

const PARAM = /^([a-z][a-z0-9_]*)\s*=\s*(-?\d+(?:[.,]\d+)?)$/;

export type ParamsParse =
  { ok: true; params: Record<string, number> } | { ok: false; message: string };

export function parseParams(text: string): ParamsParse {
  const params: Record<string, number> = {};
  const parts = text
    .split(/[;\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
  for (const part of parts) {
    const match = PARAM.exec(part);
    if (!match) {
      return { ok: false, message: `"${part}" não é nome=número (ex.: valor=0,12)` };
    }
    const [, name = "", value = "0"] = match;
    if (Object.hasOwn(params, name)) return { ok: false, message: `"${name}" aparece duas vezes` };
    params[name] = Number(value.replace(",", "."));
  }
  return { ok: true, params };
}

export function formatParams(params: Readonly<Record<string, number>>): string {
  return Object.entries(params)
    .map(([name, value]) => `${name}=${String(value).replace(".", ",")}`)
    .join("; ");
}
