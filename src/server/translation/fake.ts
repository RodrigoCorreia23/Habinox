import type { MachineTranslator, TranslationItem, TranslationResult } from "./client";

/** Para desenvolvimento e testes sem chave: marca o texto com a língua ("Portões [EN]"). */
export class FakeTranslator implements MachineTranslator {
  readonly source = "fake";

  async translate(items: TranslationItem[], locales: string[]): Promise<TranslationResult> {
    return Object.fromEntries(
      items.map((item) => [
        item.id,
        Object.fromEntries(locales.map((l) => [l, `${item.text} [${l.toUpperCase()}]`])),
      ]),
    );
  }
}
