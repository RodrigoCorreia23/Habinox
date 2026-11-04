/**
 * Aplica as regras às escolhas do cliente: que opções se veem, quais são
 * obrigatórias, que valores são permitidos e que combinações são impossíveis.
 * Corre no configurador e no servidor; o servidor recusa qualquer erro,
 * nunca corrige em silêncio.
 *
 * Uma passagem, de cima para baixo: as regras de uma opção só dependem de
 * opções anteriores (o backoffice garante-o). Condição sobre uma opção sem
 * valor (escondida ou vazia) é sempre falsa.
 */
import type { Condition, ConfigValue, ProductOptionDef, ResolvedValues, Rule } from "./schema";

export interface OptionState {
  visible: boolean;
  required: boolean;
  /** Valores permitidos depois das regras (só `choice`). */
  allowed?: string[];
}

export type ConfigErrorCode =
  "required" | "invalid_type" | "out_of_range" | "step" | "not_allowed" | "forbidden";

export interface ConfigError {
  option?: string;
  code: ConfigErrorCode;
  message: string;
}

export interface ResolvedConfig {
  values: ResolvedValues;
  state: Readonly<Record<string, OptionState>>;
  errors: ConfigError[];
}

const EPSILON = 1e-9;

export function conditionHolds(condition: Condition, values: ResolvedValues): boolean {
  const value = values[condition.option];
  if (value === undefined) return false;
  switch (condition.op) {
    case "eq":
      return value === condition.value;
    case "ne":
      return value !== condition.value;
    case "in":
      return typeof value === "string" && condition.values.includes(value);
    case "not_in":
      return typeof value === "string" && !condition.values.includes(value);
    case "is_true":
      return value === true;
    case "is_false":
      return value === false;
    case "gt":
    case "lt":
    case "gte":
    case "lte": {
      if (typeof value !== "number") return false;
      let right: number;
      if (typeof condition.value === "number") {
        right = condition.value;
      } else {
        const other = values[condition.value.option];
        if (typeof other !== "number") return false;
        right = other * condition.value.factor;
      }
      if (condition.op === "gt") return value > right;
      if (condition.op === "lt") return value < right;
      if (condition.op === "gte") return value >= right;
      return value <= right;
    }
  }
}

export function allConditionsHold(conditions: readonly Condition[], values: ResolvedValues) {
  return conditions.every((condition) => conditionHolds(condition, values));
}

function isEmpty(raw: unknown): boolean {
  return raw === undefined || raw === null || raw === "";
}

function validateValue(
  option: ProductOptionDef,
  raw: unknown,
  allowed: readonly string[] | undefined,
): ConfigValue | ConfigError {
  const fail = (code: ConfigErrorCode, message: string): ConfigError => ({
    option: option.key,
    code,
    message,
  });

  switch (option.type) {
    case "boolean":
      return typeof raw === "boolean" ? raw : fail("invalid_type", "Tem de ser sim ou não");
    case "choice":
      if (typeof raw !== "string") return fail("invalid_type", "Valor inválido");
      return allowed?.includes(raw) ? raw : fail("not_allowed", "Valor não disponível");
    case "dimension":
    case "number": {
      if (typeof raw !== "number" || !Number.isFinite(raw)) {
        return fail("invalid_type", "Tem de ser um número");
      }
      if (option.type === "dimension" && !Number.isInteger(raw)) {
        return fail("invalid_type", "Medida em mm inteiros");
      }
      if (option.min != null && raw < option.min) return fail("out_of_range", "Abaixo do mínimo");
      if (option.max != null && raw > option.max) return fail("out_of_range", "Acima do máximo");
      if (option.step != null && option.step > 0) {
        const offset = (raw - (option.min ?? 0)) / option.step;
        if (Math.abs(offset - Math.round(offset)) > EPSILON) {
          return fail("step", `Tem de variar de ${option.step} em ${option.step}`);
        }
      }
      return raw;
    }
  }
}

export function resolveConfig(
  options: readonly ProductOptionDef[],
  rules: readonly Rule[],
  input: Readonly<Record<string, unknown>>,
): ResolvedConfig {
  const values: Record<string, ConfigValue> = {};
  const state: Record<string, OptionState> = {};
  const errors: ConfigError[] = [];

  for (const option of options) {
    const active = rules.filter(
      (rule) =>
        "option" in rule.effect &&
        rule.effect.option === option.key &&
        allConditionsHold(rule.conditions, values),
    );

    const visible = !active.some((rule) => rule.effect.type === "hide");
    const required = option.required || active.some((rule) => rule.effect.type === "require");

    let allowed: string[] | undefined;
    if (option.type === "choice") {
      allowed = (option.values ?? []).map((value) => value.key);
      for (const rule of active) {
        if (rule.effect.type === "restrict") {
          const permitted = rule.effect.values;
          allowed = allowed.filter((value) => permitted.includes(value));
        }
      }
    }

    state[option.key] = { visible, required, ...(allowed && { allowed }) };
    if (!visible) continue;

    const raw = input[option.key];
    if (isEmpty(raw)) {
      // Um sim/não por preencher é "não".
      if (option.type === "boolean") values[option.key] = false;
      else if (required) {
        errors.push({ option: option.key, code: "required", message: "Obrigatório" });
      }
      continue;
    }

    const result = validateValue(option, raw, allowed);
    if (typeof result === "object") errors.push(result);
    else values[option.key] = result;
  }

  for (const rule of rules) {
    if (rule.effect.type === "forbid" && allConditionsHold(rule.conditions, values)) {
      errors.push({
        code: "forbidden",
        message: rule.message ?? "Esta combinação não é possível",
      });
    }
  }

  return { values, state, errors };
}
