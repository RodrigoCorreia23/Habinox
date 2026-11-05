import { describe, expect, it } from "vitest";
import { AnthropicTranslator } from "@/server/translation/anthropic";

/** Resposta simulada da API (formato da Messages API) com o texto dado. */
function fakeApi(text: string, stopReason = "end_turn") {
  const requests: Record<string, unknown>[] = [];
  const fetchFn = (async (_url: unknown, init?: RequestInit) => {
    requests.push(JSON.parse(String(init?.body)));
    return new Response(
      JSON.stringify({
        id: "msg_test",
        type: "message",
        role: "assistant",
        model: "claude-opus-5-5",
        content: [{ type: "text", text }],
        stop_reason: stopReason,
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 10 },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;
  return { fetchFn, requests };
}

const items = [
  { id: "category.name|c1", text: "Portões", kind: "Categorias · Nome", context: null },
  { id: "optionValue.label|v1", text: "Inox 304 escovado", kind: "Valor", context: "Material" },
];

describe("AnthropicTranslator", () => {
  it("pede JSON estruturado ao modelo certo, com fallbacks, e lê as traduções", async () => {
    const { fetchFn, requests } = fakeApi(
      JSON.stringify({
        translations: [
          { id: "category.name|c1", en: "Gates", de: "Tore" },
          {
            id: "optionValue.label|v1",
            en: "Brushed 304 stainless steel",
            de: "Edelstahl 304 gebürstet",
          },
          { id: "desconhecido", en: "x", de: "y" },
        ],
      }),
    );
    const translator = new AnthropicTranslator("test-key", { fetch: fetchFn, maxRetries: 0 });
    const result = await translator.translate(items, ["en", "de"]);

    expect(result).toEqual({
      "category.name|c1": { en: "Gates", de: "Tore" },
      "optionValue.label|v1": { en: "Brushed 304 stainless steel", de: "Edelstahl 304 gebürstet" },
    });
    const body = requests[0]!;
    expect(body.model).toBe("claude-opus-5-5");
    expect(body.fallbacks).toBe("default");
    expect((body.output_config as { effort: string }).effort).toBe("low");
    expect((body.output_config as { format: { type: string } }).format.type).toBe("json_schema");
    expect(JSON.stringify(body.messages)).toContain("Inox 304 escovado");
  });

  it("uma recusa ou uma resposta cortada dão erro (o lote fica para a próxima)", async () => {
    const refused = new AnthropicTranslator("k", {
      fetch: fakeApi("", "refusal").fetchFn,
      maxRetries: 0,
    });
    await expect(refused.translate(items, ["en"])).rejects.toThrow(/recusada/);
    const cut = new AnthropicTranslator("k", {
      fetch: fakeApi('{"translations": [', "max_tokens").fetchFn,
      maxRetries: 0,
    });
    await expect(cut.translate(items, ["en"])).rejects.toThrow(/cortada/);
  });

  it("sem textos não chama a API", async () => {
    const { fetchFn, requests } = fakeApi("{}");
    await new AnthropicTranslator("k", { fetch: fetchFn }).translate([], ["en"]);
    expect(requests).toHaveLength(0);
  });
});
