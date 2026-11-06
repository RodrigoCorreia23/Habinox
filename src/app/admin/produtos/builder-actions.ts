"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { log } from "@/lib/log";
import { percentToFraction } from "@/lib/percent";
import { BASES, type BuilderSpec, parseBuilderNumber } from "@/lib/pricing/builder";
import { requireAdmin } from "@/server/auth/session";
import {
  addDivision,
  addValue,
  copyDivision,
  type CostInput,
  type DivisionType,
  removeBaseLine,
  removeDivision,
  removeValue,
  renameValue,
  type Role,
  saveBaseLine,
  setDefaultValue,
  setValueCost,
  updateDivision,
} from "@/server/catalog/builder";
import { translateInBackground } from "@/server/catalog/translations";

export type BuilderState = { ok: boolean; message?: string; id?: string };

const uuid = z.uuid();
const name = z.string().trim().min(1, "Escreva o nome").max(80, "Até 80 caracteres");
const ROLES = ["width", "height", "other"] as const;

async function guard(productId: string, ...ids: (string | null)[]) {
  const session = await requireAdmin(`/admin/produtos/${productId}`);
  const valid = [productId, ...ids].every((id) => id === null || uuid.safeParse(id).success);
  return valid ? session : null;
}

function done(productId: string, result: { ok: boolean; message?: string; id?: string }) {
  revalidatePath(`/admin/produtos/${productId}`);
  return result.ok ? { ok: true, id: result.id } : { ok: false, message: result.message };
}

const INVALID: BuilderState = { ok: false, message: "Pedido inválido" };

export async function addDivisionAction(
  productId: string,
  versionId: string,
  rawName: string,
  type: DivisionType,
  role: Role,
): Promise<BuilderState> {
  const session = await guard(productId, versionId);
  if (!session) return INVALID;
  const parsed = name.safeParse(rawName);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };
  if (type !== "dimension" && type !== "choice") return INVALID;
  if (!(ROLES as readonly string[]).includes(role)) return INVALID;
  const result = await addDivision(versionId, { name: parsed.data, type, role });
  log.info("builder.division_added", { productId, versionId, type, userId: session.user.id });
  if (result.ok) translateInBackground();
  return done(productId, result);
}

/** mm escritos pelo Bruno: "1 000" → 1000; vazio → null. */
function mm(value: string | undefined): number | null | undefined | false {
  if (value === undefined) return undefined;
  const text = value.replace(/[\s  ]/g, "");
  if (text === "") return null;
  if (!/^\d{1,6}$/.test(text)) return false;
  return Number(text);
}

export async function updateDivisionAction(
  productId: string,
  versionId: string,
  productOptionId: string,
  patch: {
    name?: string;
    role?: Role;
    min?: string;
    max?: string;
    step?: string;
    required?: boolean;
  },
): Promise<BuilderState> {
  const session = await guard(productId, versionId, productOptionId);
  if (!session) return INVALID;
  const input: Parameters<typeof updateDivision>[2] = {};
  if (patch.name !== undefined) {
    const parsed = name.safeParse(patch.name);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };
    input.name = parsed.data;
  }
  if (patch.role !== undefined) {
    if (!(ROLES as readonly string[]).includes(patch.role)) return INVALID;
    input.role = patch.role;
  }
  for (const field of ["min", "max", "step"] as const) {
    const value = mm(patch[field]);
    if (value === false) return { ok: false, message: "Escreva um número inteiro de milímetros" };
    if (value !== undefined) input[field] = value;
  }
  if (patch.required !== undefined) input.required = patch.required;
  const result = await updateDivision(versionId, productOptionId, input);
  log.info("builder.division_updated", { productId, productOptionId, userId: session.user.id });
  if (result.ok && input.name) translateInBackground();
  return done(productId, result);
}

export async function removeDivisionAction(
  productId: string,
  versionId: string,
  productOptionId: string,
): Promise<BuilderState> {
  const session = await guard(productId, versionId, productOptionId);
  if (!session) return INVALID;
  const result = await removeDivision(versionId, productOptionId);
  log.info("builder.division_removed", { productId, productOptionId, userId: session.user.id });
  return done(productId, result);
}

export async function addValueAction(
  productId: string,
  versionId: string,
  productOptionId: string,
  rawName: string,
): Promise<BuilderState> {
  const session = await guard(productId, versionId, productOptionId);
  if (!session) return INVALID;
  const parsed = name.safeParse(rawName);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };
  const result = await addValue(versionId, productOptionId, parsed.data);
  if (result.ok) translateInBackground();
  return done(productId, result);
}

export async function renameValueAction(
  productId: string,
  versionId: string,
  valueId: string,
  rawName: string,
): Promise<BuilderState> {
  const session = await guard(productId, versionId, valueId);
  if (!session) return INVALID;
  const parsed = name.safeParse(rawName);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };
  const result = await renameValue(versionId, valueId, parsed.data);
  if (result.ok) translateInBackground();
  return done(productId, result);
}

export async function removeValueAction(
  productId: string,
  versionId: string,
  productOptionId: string,
  valueId: string,
): Promise<BuilderState> {
  if (!(await guard(productId, versionId, productOptionId, valueId))) return INVALID;
  return done(productId, await removeValue(versionId, productOptionId, valueId));
}

export async function setDefaultValueAction(
  productId: string,
  versionId: string,
  productOptionId: string,
  valueId: string,
): Promise<BuilderState> {
  if (!(await guard(productId, versionId, productOptionId, valueId))) return INVALID;
  return done(productId, await setDefaultValue(versionId, productOptionId, valueId));
}

export interface CostPayload {
  source: "material" | "sector";
  itemId: string;
  basis: string;
  factor: string;
  fixed: string;
  /** Percentagem escrita ("30", "12,5"); vazio = por escrever. */
  margin: string;
}

function parseCost(payload: CostPayload): CostInput | string {
  if (payload.source !== "material" && payload.source !== "sector") return "Escolha o artigo";
  if (!uuid.safeParse(payload.itemId).success) return "Escolha o artigo";
  if (!(BASES as readonly string[]).includes(payload.basis)) return "Escolha como conta";
  const factor = parseBuilderNumber(payload.factor, "1");
  const fixed = parseBuilderNumber(payload.fixed, "0");
  if (factor === null || fixed === null) return "Escreva números positivos (ex.: 2 ou 0,5)";
  if (Number(factor) === 0 && Number(fixed) === 0) return "A quantidade não pode ser zero";
  let margin: string | null = null;
  if (payload.margin.trim() !== "") {
    const parsed = percentToFraction(payload.margin);
    if (!parsed.ok) return parsed.message;
    margin = parsed.fraction;
  }
  const spec: BuilderSpec = { basis: payload.basis as BuilderSpec["basis"], factor, fixed };
  return { source: payload.source, itemId: payload.itemId, spec, margin };
}

export async function setValueCostAction(
  productId: string,
  versionId: string,
  productOptionId: string,
  valueId: string,
  payload: CostPayload | null,
): Promise<BuilderState> {
  const session = await guard(productId, versionId, productOptionId, valueId);
  if (!session) return INVALID;
  const input = payload ? parseCost(payload) : null;
  if (typeof input === "string") return { ok: false, message: input };
  const result = await setValueCost(versionId, productOptionId, valueId, input);
  log.info("builder.value_cost", {
    productId,
    valueId,
    set: Boolean(input),
    userId: session.user.id,
  });
  return done(productId, result);
}

export async function saveBaseLineAction(
  productId: string,
  versionId: string,
  lineId: string | null,
  label: string,
  payload: CostPayload,
): Promise<BuilderState> {
  const session = await guard(productId, versionId, lineId);
  if (!session) return INVALID;
  const input = parseCost(payload);
  if (typeof input === "string") return { ok: false, message: input };
  const result = await saveBaseLine(versionId, lineId, label.trim().slice(0, 80), input);
  log.info("builder.base_line", {
    productId,
    lineId: result.ok ? result.id : lineId,
    userId: session.user.id,
  });
  return done(productId, result);
}

export async function removeBaseLineAction(
  productId: string,
  versionId: string,
  lineId: string,
): Promise<BuilderState> {
  if (!(await guard(productId, versionId, lineId))) return INVALID;
  return done(productId, await removeBaseLine(versionId, lineId));
}

export async function copyDivisionAction(
  productId: string,
  versionId: string,
  fromProductOptionId: string,
): Promise<BuilderState> {
  const session = await guard(productId, versionId, fromProductOptionId);
  if (!session) return INVALID;
  const result = await copyDivision(versionId, fromProductOptionId);
  log.info("builder.division_copied", { productId, fromProductOptionId, userId: session.user.id });
  if (result.ok) translateInBackground();
  return done(productId, result);
}
