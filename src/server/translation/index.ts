import { env } from "@/env";
import { AnthropicTranslator } from "./anthropic";
import type { MachineTranslator } from "./client";
import { FakeTranslator } from "./fake";

export type { MachineTranslator, TranslationItem, TranslationResult } from "./client";

/**
 * O tradutor a usar: o Claude com chave; sem chave, o de teste só em
 * development. Noutros ambientes sem chave devolve null: nada é traduzido e a
 * loja mostra o português (não se gravam traduções de teste em produção).
 */
export function getTranslator(): MachineTranslator | null {
  if (env.ANTHROPIC_API_KEY) return new AnthropicTranslator(env.ANTHROPIC_API_KEY);
  if (env.NEXT_PUBLIC_APP_ENV === "development") return new FakeTranslator();
  return null;
}
