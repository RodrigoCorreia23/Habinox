/**
 * Valor de opção a partir de um artigo do ERP (ex.: as cores RAL registadas no
 * Odoo). Puro: «RAL 7016 Cinzento antracite» → nome «Cinzento antracite»,
 * código «RAL 7016», chave «cinzento_antracite».
 */
import { keyFromName } from "./text";

const RAL = /\bRAL\s*-?\s*(\d{4})\b/i;

export interface ValueFromArticle {
  label: string;
  key: string;
  ralCode: string;
}

export function valueFromArticle(name: string): ValueFromArticle {
  const match = RAL.exec(name);
  const ralCode = match ? `RAL ${match[1]}` : "";
  // Sem o código, o nome fica o que se diz ao cliente; se não sobrar nada, fica o nome todo.
  const rest = match
    ? name
        .replace(match[0], "")
        .replace(/^[\s\-–—:·]+|[\s\-–—:·]+$/g, "")
        .trim()
    : name.trim();
  const label = rest || name.trim();
  return { label, key: keyFromName(ralCode ? `${ralCode} ${label}` : label), ralCode };
}
