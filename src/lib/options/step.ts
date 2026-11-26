/**
 * Passo das medidas e números: os valores aceites são mínimo, mínimo + passo,
 * mínimo + 2 × passo… (sem mínimo, conta a partir de 0), dentro dos limites.
 * A mesma regra do `resolveConfig`; aqui só se calcula o que ajuda a explicá-la.
 */

/** Limites e passo de uma opção numérica (os campos do `ProductOptionDef`). */
export interface StepBounds {
  min: number | null;
  max: number | null;
  step: number | null;
}

/** Tira o ruído de vírgula flutuante (ex.: 0,1 + 0,2) sem mudar valores reais. */
const clean = (value: number) => Number(value.toFixed(9));

const hasStep = (bounds: StepBounds): bounds is StepBounds & { step: number } =>
  bounds.step != null && bounds.step > 0;

/**
 * Maior valor aceite quando o máximo não cai no passo; null se o máximo é
 * aceite (ou se não há passo, máximo ou valor aceite nenhum).
 * Ex.: mínimo 5, passo 10, máximo 1000 → 995.
 */
export function lastReachable(bounds: StepBounds): number | null {
  if (!hasStep(bounds) || bounds.max == null) return null;
  const base = bounds.min ?? 0;
  if (bounds.max < base) return null;
  const steps = clean((bounds.max - base) / bounds.step);
  if (Number.isInteger(steps)) return null;
  return clean(base + Math.floor(steps) * bounds.step);
}

/**
 * Valores aceites mais próximos de um valor fora do passo: o de baixo e o de
 * cima, cada um null se sair dos limites. Ex.: mínimo 5, passo 10, 1000 → 995 e 1005
 * (ou só 995 se o máximo for 1000).
 */
export function nearestSteps(
  bounds: StepBounds,
  value: number,
): { below: number | null; above: number | null } {
  if (!hasStep(bounds)) return { below: null, above: null };
  const base = bounds.min ?? 0;
  const below = clean(base + Math.floor(clean((value - base) / bounds.step)) * bounds.step);
  const above = clean(below + bounds.step);
  const inside = (candidate: number) =>
    (bounds.min == null || candidate >= bounds.min) &&
    (bounds.max == null || candidate <= bounds.max);
  return { below: inside(below) ? below : null, above: inside(above) ? above : null };
}
