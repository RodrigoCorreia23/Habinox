/**
 * Dados da empresa usados nas páginas legais e no rodapé.
 * Os valores entre [ ] faltam: o Bruno tem de os dar antes de abrir a loja
 * (o Código das Sociedades Comerciais, art. 171.º, obriga a mostrá-los no site).
 */
export const COMPANY = {
  name: "Bruno Miguel Freitas, Lda.",
  brand: "HABINOX®",
  nipc: "[NIPC]",
  registry: "[Conservatória do Registo Comercial e n.º de matrícula]",
  capital: "[capital social]",
  address: "Núcleo Industrial de Antas, 4740-016 Antas, Esposende, Portugal",
  email: "geral@habinox.pt",
  phone: "253 873 429",
  mobile: "969 413 616",
  hours: "dias úteis, das 9h00 às 18h30",
} as const;

/** Resolução alternativa de litígios de consumo (Lei 144/2015): competente para Esposende. */
export const ADR = {
  name: "CIAB – Centro de Informação, Mediação e Arbitragem de Consumo (Tribunal Arbitral de Consumo)",
  address: "Rua D. Afonso Henriques, 1, 4700-030 Braga",
  phone: "253 617 604",
  email: "geral@ciab.pt",
  url: "https://www.ciab.pt",
} as const;

export const COMPLAINTS_BOOK_URL = "https://www.livroreclamacoes.pt";
