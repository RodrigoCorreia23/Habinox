import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CONTENT_LOCALES } from "@/lib/localized";

/**
 * As traduções têm de ter exatamente as mesmas chaves que o português e, em
 * cada mensagem, as mesmas variáveis ICU ({count}, {email}…) e as mesmas
 * etiquetas (<terms>…). O texto dentro dos ramos do plural não conta.
 */
type Messages = { [key: string]: string | string[] | Messages };

function load(locale: string): Messages {
  return JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as Messages;
}

function flatten(messages: Messages, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(messages)) {
    const path = prefix + key;
    if (typeof value === "string") out.set(path, value);
    else if (Array.isArray(value)) value.forEach((item, i) => out.set(`${path}[${i}]`, item));
    else for (const [k, v] of flatten(value, `${path}.`)) out.set(k, v);
  }
  return out;
}

/** Variáveis e etiquetas de uma mensagem ICU, sem contar o texto dos ramos. */
function signature(message: string): string[] {
  const found = new Set<string>();
  let i = 0;

  function text(until: string | null) {
    while (i < message.length) {
      const c = message[i]!;
      if (until && c === until) return;
      if (c === "'" && (message[i + 1] === "{" || message[i + 1] === "}")) {
        i = message.indexOf("'", i + 1) + 1;
        continue;
      }
      if (c === "{") {
        i++;
        argument();
        continue;
      }
      if (c === "<") {
        const tag = /^<\/?([a-zA-Z][\w-]*)>/.exec(message.slice(i));
        if (tag) {
          found.add(`<${tag[1]}>`);
          i += tag[0].length;
          continue;
        }
      }
      i++;
    }
  }

  function argument() {
    const head = /^\s*([a-zA-Z_][\w]*)\s*(,\s*([a-zA-Z]+)\s*)?/.exec(message.slice(i));
    if (!head) throw new Error(`Argumento inválido em: ${message}`);
    found.add(`{${head[1]}}`);
    i += head[0].length;
    if (message[i] === "}") {
      i++;
      return;
    }
    // Tipo com opções: plural/select/selectordinal → seletores seguidos de {texto}.
    if (message[i] === ",") i++;
    while (i < message.length && message[i] !== "}") {
      if (message[i] === "{") {
        i++;
        text("}");
        i++;
      } else i++;
    }
    i++;
  }

  text(null);
  return [...found].sort();
}

const pt = flatten(load("pt"));
const others = CONTENT_LOCALES.filter((locale) => locale !== "pt");

describe("mensagens", () => {
  it("o analisador vê variáveis e etiquetas, não o texto dos ramos", () => {
    expect(
      signature("Carrinho, {count, plural, =0 {vazio} one {# artigo} other {# artigos}}"),
    ).toEqual(["{count}"]);
    expect(signature("Li os <terms>termos</terms> de {email}.")).toEqual(["<terms>", "{email}"]);
  });

  for (const locale of others) {
    describe(locale, () => {
      const messages = flatten(load(locale));

      it("tem exatamente as mesmas chaves que o português", () => {
        expect([...messages.keys()]).toEqual([...pt.keys()]);
      });

      it("mantém as variáveis e as etiquetas de cada mensagem", () => {
        const wrong = [...pt].filter(
          ([key, value]) => signature(value).join() !== signature(messages.get(key) ?? "").join(),
        );
        expect(wrong.map(([key]) => key)).toEqual([]);
      });

      it("não deixou mensagens vazias", () => {
        expect([...messages].filter(([, value]) => value.trim() === "").map(([k]) => k)).toEqual(
          [],
        );
      });
    });
  }
});
