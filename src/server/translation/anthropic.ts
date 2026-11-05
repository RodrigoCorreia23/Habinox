/**
 * Tradutor real: Claude (API da Anthropic), resposta em JSON validada por esquema.
 * Esforço baixo (textos curtos e simples) e, se um pedido for recusado pelos
 * filtros de segurança, a API tenta outro modelo sozinha (`fallbacks: "default"`).
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { MachineTranslator, TranslationItem, TranslationResult } from "./client";

const MODEL = "claude-opus-5-5";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English (British)",
  de: "German (formal Sie)",
  fr: "French (formal vous)",
  it: "Italian (formal Lei)",
  es: "Spanish (Spain, formal usted)",
  nl: "Dutch (formal u, neutral for the Netherlands and Flanders)",
};

const SYSTEM = `You translate the product catalogue of HABINOX®, a metalwork company in Esposende, Portugal that makes made-to-measure stainless steel, iron and aluminium products (gates, stairs, railings, chimneys, chimney caps, letterboxes) and sells them online.

The source texts are European Portuguese, written by the owner in the shop's back office: category and product names, product descriptions, option names (Largura = width, Altura = height, Material, Cor = colour…), option values (materials, finishes, RAL colours), short help texts and validation messages shown to customers.

Rules:
- Translate the meaning for a customer of that country, in the register of a sober, precise, premium shop. Names stay short, like menu labels; never add words that are not in the source.
- Use the trade terms of each language: portão de correr = sliding gate / Schiebetor / portail coulissant / cancello scorrevole / puerta corredera / schuifpoort; portão de batente = swing gate; guarda / gradeamento = railing; chapéu de chaminé = chimney cap; caixa de correio = letterbox; inox = stainless steel; lacado = powder-coated (lacquered); escovado = brushed; polido = polished.
- Keep unchanged: numbers, units (mm, cm, m, kg), RAL codes (RAL 7016), product codes, the brand HABINOX® / Habinox, and line breaks.
- If a text is a proper name or already language-neutral (e.g. "Inox 304"), translate only the words that need it.
- Return every item id you received, with one translation for every requested language.`;

function schemaFor(locales: string[]) {
  return z.object({
    translations: z.array(
      z.object({
        id: z.string(),
        ...Object.fromEntries(locales.map((locale) => [locale, z.string()])),
      }),
    ),
  });
}

export class AnthropicTranslator implements MachineTranslator {
  readonly source = "anthropic";
  private readonly client: Anthropic;

  constructor(apiKey: string, options: { fetch?: typeof fetch; maxRetries?: number } = {}) {
    // Repete sozinho 429, 5xx e falhas de rede (até 2 vezes); 60 s por pedido chega para um lote.
    this.client = new Anthropic({
      apiKey,
      timeout: 60_000,
      maxRetries: options.maxRetries ?? 2,
      fetch: options.fetch,
    });
  }

  async translate(items: TranslationItem[], locales: string[]): Promise<TranslationResult> {
    if (items.length === 0 || locales.length === 0) return {};
    const languages = locales.map((l) => `- ${l}: ${LANGUAGE_NAMES[l] ?? l}`).join("\n");
    const payload = items.map((item) => ({
      id: item.id,
      kind: item.kind,
      context: item.context ?? undefined,
      text: item.text,
    }));

    const schema = schemaFor(locales);
    const response = await this.client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { effort: "low", format: betaZodOutputFormat(schema) },
      messages: [
        {
          role: "user",
          content: `Translate each item's "text" into these languages:\n${languages}\n\nItems (JSON):\n${JSON.stringify(payload, null, 2)}`,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      throw new Error(`Tradução recusada: ${response.stop_details?.category ?? "sem categoria"}`);
    }
    if (response.stop_reason === "max_tokens") {
      throw new Error("Tradução cortada (max_tokens): lote demasiado grande");
    }
    // A API impõe o esquema; valida-se outra vez aqui, depois do motivo de paragem.
    const text = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("");
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("Resposta do tradutor sem JSON válido");
    }
    const checked = schema.safeParse(json);
    if (!checked.success) throw new Error("Resposta do tradutor fora do esquema");
    const parsed = checked.data;

    const wanted = new Set(items.map((item) => item.id));
    const result: TranslationResult = {};
    for (const entry of parsed.translations as Record<string, string>[]) {
      const id = entry.id;
      if (!id || !wanted.has(id)) continue;
      const texts: Record<string, string> = {};
      for (const locale of locales) {
        const text = entry[locale]?.trim();
        if (text) texts[locale] = text;
      }
      result[id] = texts;
    }
    return result;
  }
}
