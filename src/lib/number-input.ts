/**
 * Números escritos pelo cliente no configurador, conforme a língua.
 * Em inglês o separador decimal é o ponto e a vírgula agrupa milhares; nas
 * outras línguas da loja a vírgula é decimal (o ponto também se aceita, porque
 * muita gente escreve "2.5"). Espaços nunca contam.
 */
export function normalizeNumberInput(text: string, locale: string): string {
  const compact = text.trim().replace(/[\s  ]/g, "");
  if (locale === "en") return compact.replace(/,/g, "");
  return compact.replace(",", ".");
}

/** Para mostrar medidas e limites: sem separador de milhares (o campo volta a lê-lo). */
export function measureFormat(intlLocale: string): Intl.NumberFormat {
  return new Intl.NumberFormat(intlLocale, { useGrouping: false, maximumFractionDigits: 3 });
}
