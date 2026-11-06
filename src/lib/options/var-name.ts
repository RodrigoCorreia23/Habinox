/**
 * Letra curta para uma medida na fórmula (em vez da chave longa
 * `largura_da_caixa`): as convenções da oficina primeiro (Largura → L,
 * Altura → H…), senão a primeira letra livre das palavras do nome. Devolve null
 * se não houver letra livre (a fórmula usa então a chave). Puro.
 */
const CONVENTIONS: [RegExp, string][] = [
  [/^largura/, "L"],
  [/^altura/, "H"],
  [/^comprimento/, "C"],
  [/^profundidade/, "P"],
  [/^espessura/, "E"],
  [/^di[aâ]metro/, "D"],
];

export function suggestVarName(name: string, taken: Iterable<string>): string | null {
  const used = new Set([...taken].map((value) => value.toUpperCase()));
  const plain = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const candidates: string[] = [];
  for (const [pattern, letter] of CONVENTIONS) if (pattern.test(plain)) candidates.push(letter);
  for (const word of plain.split(/[^a-z]+/).filter((w) => w.length > 2)) {
    candidates.push(word[0]!.toUpperCase());
  }
  return candidates.find((letter) => !used.has(letter)) ?? null;
}
