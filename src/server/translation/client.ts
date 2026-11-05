/**
 * Tradutor automático do catálogo, atrás de uma interface (regra do projeto
 * para integrações externas): o real usa o Claude; o de teste corre sem chave.
 */
export interface TranslationItem {
  /** Identificador devolvido com a tradução. */
  id: string;
  text: string;
  /** O que é o texto (ex.: "nome de categoria"), para o tradutor acertar o registo. */
  kind: string;
  /** Onde aparece (ex.: o produto ou a opção a que pertence). */
  context: string | null;
}

/** id → língua → texto traduzido. */
export type TranslationResult = Record<string, Record<string, string>>;

export interface MachineTranslator {
  readonly source: string;
  translate(items: TranslationItem[], locales: string[]): Promise<TranslationResult>;
}
