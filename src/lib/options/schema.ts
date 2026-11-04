/**
 * Condições e regras das opções (desenho em docs/modelo-opcoes.md).
 * JSON estruturado, validado com Zod: é o formato guardado em
 * `option_rules.conditions`/`effect` e em `formula_lines.conditions`.
 */
import { z } from "zod";

const key = z.string().regex(/^[a-z][a-z0-9_]*$/, "Só minúsculas, números e _");

const choiceCondition = z.discriminatedUnion("op", [
  z.object({ option: key, op: z.literal("eq"), value: key }),
  z.object({ option: key, op: z.literal("ne"), value: key }),
  z.object({ option: key, op: z.literal("in"), values: z.array(key).min(1) }),
  z.object({ option: key, op: z.literal("not_in"), values: z.array(key).min(1) }),
]);

const booleanCondition = z.object({ option: key, op: z.enum(["is_true", "is_false"]) });

/** Lado direito numérico: um número (em mm nas medidas) ou outra opção × fator. */
const numericCondition = z.object({
  option: key,
  op: z.enum(["gt", "lt", "gte", "lte"]),
  value: z.union([z.number(), z.object({ option: key, factor: z.number().positive().default(1) })]),
});

export const conditionSchema = z.union([choiceCondition, booleanCondition, numericCondition]);
export const conditionsSchema = z.array(conditionSchema);

export const ruleEffectSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("restrict"), option: key, values: z.array(key).min(1) }),
  z.object({ type: z.literal("hide"), option: key }),
  z.object({ type: z.literal("require"), option: key }),
  z.object({ type: z.literal("forbid") }),
]);

export const ruleSchema = z.object({
  conditions: conditionsSchema.min(1),
  effect: ruleEffectSchema,
  message: z.string().optional(),
});

export type Condition = z.infer<typeof conditionSchema>;
export type RuleEffect = z.infer<typeof ruleEffectSchema>;
export type Rule = z.infer<typeof ruleSchema>;

export type OptionType = "dimension" | "number" | "choice" | "boolean";

export interface OptionValueDef {
  key: string;
  /** Números com nome usados nas expressões como `opcao.parametro`. */
  params?: Readonly<Record<string, number>>;
}

/** Uma opção tal como o produto a usa (biblioteca + limites do produto), pela ordem do produto. */
export interface ProductOptionDef {
  key: string;
  type: OptionType;
  /** Nome na fórmula (L, H…); por omissão, a chave. */
  var?: string | null;
  required: boolean;
  /** Medidas em mm inteiros. */
  min?: number | null;
  max?: number | null;
  step?: number | null;
  /** Valores permitidos neste produto, por ordem (só `choice`). */
  values?: readonly OptionValueDef[];
}

export type ConfigValue = number | string | boolean;
export type ResolvedValues = Readonly<Record<string, ConfigValue>>;
