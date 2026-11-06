/**
 * Regras "se… então…": do produto (numa versão) ou da biblioteca
 * (sem versão, valem em todos os produtos que usem as opções).
 * E a validação e publicação de uma versão de produto.
 */
import { and, asc, eq, inArray, isNotNull, isNull, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import {
  materials,
  optionDefinitions,
  optionRules,
  productOptions,
  products,
  productVersions,
} from "@/db/schema";
import type { LocalizedText } from "@/lib/localized";
import {
  blockedDefaults,
  conditionsSchema,
  ruleEffectSchema,
  type Rule,
  validateRules,
} from "@/lib/options";
import { validateFormula } from "@/lib/pricing";
import { loadPricingModel } from "./formula";
import { listCurrentVersions, type ProductRef } from "./options";
import { editableVersion, type Result } from "./products";

export type RuleRow = typeof optionRules.$inferSelect;

export async function listRules(versionId: string | null) {
  return db
    .select()
    .from(optionRules)
    .where(
      versionId
        ? eq(optionRules.productVersionId, versionId)
        : isNull(optionRules.productVersionId),
    )
    .orderBy(asc(optionRules.position));
}

export const ruleInputSchema = z
  .object({
    // Sem condições = vale sempre. A action só deixa passar com a confirmação
    // explícita «Aplicar a todos os produtos» (allProducts=on).
    conditions: conditionsSchema,
    effect: ruleEffectSchema,
    message: z.string().trim().max(300),
  })
  .refine((input) => input.effect.type !== "forbid" || input.message !== "", {
    path: ["message"],
    message: "Escreva a mensagem que o cliente vê",
  });
export type RuleInput = z.infer<typeof ruleInputSchema>;

export async function saveRule(
  versionId: string | null,
  id: string | null,
  input: RuleInput,
): Promise<Result<keyof RuleInput>> {
  return db.transaction(async (tx) => {
    if (versionId && !(await editableVersion(tx, versionId))) {
      return { ok: false, message: "Esta versão já não se pode editar" };
    }
    const message: LocalizedText | null = input.message ? { pt: input.message } : null;
    const scope = versionId
      ? eq(optionRules.productVersionId, versionId)
      : isNull(optionRules.productVersionId);
    if (id) {
      const updated = await tx
        .update(optionRules)
        .set({ conditions: input.conditions, effect: input.effect, message })
        .where(and(eq(optionRules.id, id), scope))
        .returning({ id: optionRules.id });
      if (!updated.length) return { ok: false, message: "Regra não encontrada" };
      return { ok: true, id };
    }
    const [{ last } = { last: null }] = await tx
      .select({ last: max(optionRules.position) })
      .from(optionRules)
      .where(scope);
    const [created] = await tx
      .insert(optionRules)
      .values({
        productVersionId: versionId,
        position: (last ?? -1) + 1,
        conditions: input.conditions,
        effect: input.effect,
        message,
      })
      .returning({ id: optionRules.id });
    return { ok: true, id: created!.id };
  });
}

export async function removeRule(id: string): Promise<Result> {
  return db.transaction(async (tx) => {
    const [rule] = await tx.select().from(optionRules).where(eq(optionRules.id, id));
    if (!rule) return { ok: false, message: "Regra não encontrada" };
    if (rule.productVersionId && !(await editableVersion(tx, rule.productVersionId))) {
      return { ok: false, message: "Esta versão já não se pode editar" };
    }
    await tx.delete(optionRules).where(eq(optionRules.id, id));
    return { ok: true, id };
  });
}

/** Opções de que uma regra fala: as das condições e a que ela afeta. */
export function ruleOptionKeys(rule: Pick<RuleRow, "conditions" | "effect">): string[] {
  const keys = rule.conditions.flatMap((condition) =>
    "value" in condition && typeof condition.value === "object"
      ? [condition.option, condition.value.option]
      : [condition.option],
  );
  if ("option" in rule.effect) keys.push(rule.effect.option);
  return [...new Set(keys)];
}

/**
 * Produtos a que cada regra da biblioteca se aplica: os que usam todas as opções
 * de que a regra fala (na versão publicada ou na que se está a preparar).
 * Devolve id da regra → produtos, por ordem alfabética.
 */
export async function listLibraryRuleProducts(
  rules: Pick<RuleRow, "id" | "conditions" | "effect">[],
): Promise<Map<string, ProductRef[]>> {
  const result = new Map<string, ProductRef[]>();
  const versions = await listCurrentVersions();
  if (versions.size === 0 || rules.length === 0) return result;
  const rows = await db
    .select({ versionId: productOptions.productVersionId, key: optionDefinitions.key })
    .from(productOptions)
    .innerJoin(optionDefinitions, eq(optionDefinitions.id, productOptions.optionId))
    .where(inArray(productOptions.productVersionId, [...versions.keys()]));
  const keysByVersion = new Map<string, Set<string>>();
  for (const row of rows) {
    const keys = keysByVersion.get(row.versionId) ?? new Set<string>();
    keys.add(row.key);
    keysByVersion.set(row.versionId, keys);
  }
  for (const rule of rules) {
    const needed = ruleOptionKeys(rule);
    const found = new Map<string, ProductRef>();
    for (const [versionId, keys] of keysByVersion) {
      if (needed.every((key) => keys.has(key))) {
        const product = versions.get(versionId)!;
        found.set(product.id, product);
      }
    }
    result.set(
      rule.id,
      [...found.values()].sort((a, b) => a.name.localeCompare(b.name, "pt")),
    );
  }
  return result;
}

// ── Validar e publicar ──────────────────────────────────────────────────────

export interface VersionProblems {
  /** Impedem validar/publicar. */
  blocking: string[];
  /** Avisos: não impedem, mas convém ver. */
  warnings: string[];
}

export async function checkVersion(versionId: string): Promise<VersionProblems> {
  const blocking: string[] = [];
  const warnings: string[] = [];
  const model = await loadPricingModel(versionId);
  if (!model) return { blocking: ["Versão não encontrada"], warnings };
  const { options, variables = [], lines } = model.input;

  if (options.length === 0) blocking.push("O produto não tem opções");
  const [owner] = await db
    .select({ imageUrl: products.imageUrl })
    .from(productVersions)
    .innerJoin(products, eq(products.id, productVersions.productId))
    .where(eq(productVersions.id, versionId));
  if (owner && !owner.imageUrl) {
    warnings.push("O produto não tem imagem: na loja aparece um cartão vazio");
  }
  if (lines.length === 0) blocking.push("A fórmula não tem linhas de custo");
  for (const option of options) {
    if (option.type === "choice" && (option.values?.length ?? 0) === 0) {
      blocking.push(`A opção ${option.key} não tem valores permitidos`);
    }
    if (option.type === "dimension" && (option.min == null || option.max == null)) {
      warnings.push(
        `A medida ${option.key} não tem mínimo e máximo: o cliente pode pedir qualquer tamanho`,
      );
    }
  }

  for (const issue of validateFormula({ options, variables, lines })) {
    const label =
      issue.where.kind === "variable"
        ? `Variável ${variables[issue.where.index]?.name}`
        : `Linha "${lines[issue.where.index]?.label}"`;
    blocking.push(`${label}: ${issue.message}`);
  }

  const versionRules = await listRules(versionId);
  const toRule = (row: RuleRow): Rule => ({ conditions: row.conditions, effect: row.effect });
  for (const issue of validateRules(options, versionRules.map(toRule))) {
    blocking.push(`Regra ${issue.index + 1} do produto: ${issue.message}`);
  }
  const libraryRules = await listRules(null);
  for (const issue of validateRules(options, libraryRules.map(toRule), { library: true })) {
    blocking.push(`Regra ${issue.index + 1} da biblioteca: ${issue.message}`);
  }

  // Margens por decidir: o preço não se calcula sem elas.
  const items = [
    ...lines.flatMap((line) => [
      ...(line.item ? [line.item] : []),
      ...Object.values(line.itemByOption?.items ?? {}),
    ]),
    ...Object.values(model.input.valueComponents ?? {}).flatMap((byValue) =>
      Object.values(byValue),
    ),
  ];
  const noMargin = [
    ...new Set(items.filter((item) => item.margin === null).map((item) => item.name)),
  ];
  if (noMargin.length > 0) blocking.push(`Margem por decidir em: ${noMargin.join(", ")}`);

  for (const line of lines) {
    if (line.itemByOption && Object.keys(line.itemByOption.items).length === 0) {
      blocking.push(`Linha "${line.label}": nenhum valor da opção tem artigo`);
    } else if (!line.item && !line.itemByOption) {
      blocking.push(`Linha "${line.label}": o artigo ou o sector já não existe`);
    }
  }

  // O que vem escolhido não pode cair numa regra que bloqueia (a loja abriria com «não é possível»).
  const defaults: Record<string, string | boolean> = {};
  for (const option of model.meta) {
    const chosen = option.values.find((value) => value.isDefault) ?? option.values[0];
    if (option.type === "choice" && chosen) defaults[option.key] = chosen.key;
  }
  for (const message of blockedDefaults(options, model.rules, defaults)) {
    const names = model.meta
      .filter((option) => option.type === "choice" && defaults[option.key])
      .map((option) => {
        const value = option.values.find((v) => v.key === defaults[option.key]);
        return `${option.name}: ${value?.label ?? defaults[option.key]}`;
      })
      .join(", ");
    warnings.push(
      `Os valores que vêm escolhidos (${names}) caem numa regra que bloqueia («${message}»): a loja abriria com esse aviso. Escolha outro valor por omissão.`,
    );
  }

  // Artigos que desapareceram do ERP: mantêm o último custo, mas convém rever.
  const codes = [...new Set(items.map((item) => item.code))];
  if (codes.length > 0) {
    const gone = await db
      .select({ name: materials.name })
      .from(materials)
      .where(and(inArray(materials.erpCode, codes), isNotNull(materials.erpMissingAt)));
    if (gone.length > 0) {
      warnings.push(
        `Desapareceram do ERP (usa-se o último custo): ${gone.map((row) => row.name).join(", ")}`,
      );
    }
  }

  return { blocking, warnings };
}

/** Rascunho → validada, se não houver problemas que impeçam. */
export async function validateVersion(
  versionId: string,
): Promise<{ ok: boolean; problems: VersionProblems }> {
  const problems = await checkVersion(versionId);
  if (problems.blocking.length > 0) return { ok: false, problems };
  const updated = await db
    .update(productVersions)
    .set({ status: "validated", validatedAt: new Date() })
    .where(and(eq(productVersions.id, versionId), eq(productVersions.status, "draft")))
    .returning({ id: productVersions.id });
  return { ok: updated.length === 1, problems };
}

/** Validada → publicada: passa a ser a versão que a loja mostra. */
export async function publishVersion(versionId: string): Promise<Result> {
  // Volta a verificar: custos e margens podem ter mudado desde a validação.
  const problems = await checkVersion(versionId);
  if (problems.blocking.length > 0) {
    return { ok: false, message: `Há problemas por resolver: ${problems.blocking[0]}` };
  }
  return db.transaction(async (tx) => {
    const [version] = await tx
      .update(productVersions)
      .set({ status: "published", publishedAt: new Date() })
      .where(and(eq(productVersions.id, versionId), eq(productVersions.status, "validated")))
      .returning();
    if (!version) return { ok: false, message: "Só uma versão validada se pode publicar" };
    await tx
      .update(products)
      .set({ publishedVersionId: version.id })
      .where(eq(products.id, version.productId));
    return { ok: true, id: version.id };
  });
}
