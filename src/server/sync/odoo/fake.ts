import type { ErpArticle, ErpClient } from "./client";

/**
 * ERP em memória, para desenvolver e testar sem acessos ao Odoo.
 * Os artigos são de exemplo; não são custos da Habinox.
 */
export const SAMPLE_ARTICLES: readonly ErpArticle[] = [
  {
    code: "TF4040",
    name: "Tubo ferro 40×40×2",
    unit: "m",
    cost: "3.2000",
    weightPerUnit: "2.3200",
    family: "Tubos",
  },
  {
    code: "TI4040",
    name: "Tubo inox 304 40×40×2",
    unit: "m",
    cost: "12.4000",
    weightPerUnit: "2.4000",
    family: "Tubos",
  },
  {
    code: "TFB20",
    name: "Barra ferro 20×20",
    unit: "m",
    cost: "1.1000",
    weightPerUnit: "3.1400",
    family: "Barras",
  },
  {
    code: "TIB20",
    name: "Barra inox 304 20×20",
    unit: "m",
    cost: "4.0000",
    weightPerUnit: "3.1700",
    family: "Barras",
  },
  {
    code: "CHF2",
    name: "Chapa ferro 2 mm",
    unit: "m²",
    cost: "18.5000",
    weightPerUnit: "15.7000",
    family: "Chapas",
  },
  {
    code: "LAC",
    name: "Lacagem (serviço externo)",
    unit: "m²",
    cost: "22.0000",
    weightPerUnit: null,
    family: "Serviços externos",
  },
  // Cores: como o Bruno as regista no Odoo ainda está por confirmar (preço por cor ou só o nome).
  {
    code: "RAL7016",
    name: "RAL 7016 Cinzento antracite",
    unit: "m²",
    cost: "0.0000",
    weightPerUnit: null,
    family: "Cores RAL",
  },
  {
    code: "RAL9005",
    name: "RAL 9005 Preto",
    unit: "m²",
    cost: "0.0000",
    weightPerUnit: null,
    family: "Cores RAL",
  },
  {
    code: "RAL9010",
    name: "RAL 9010 Branco",
    unit: "m²",
    cost: "0.0000",
    weightPerUnit: null,
    family: "Cores RAL",
  },
  {
    code: "RAL6005",
    name: "RAL 6005 Verde musgo",
    unit: "m²",
    cost: "1.5000",
    weightPerUnit: null,
    family: "Cores RAL",
  },
];

export class FakeErpClient implements ErpClient {
  readonly source = "fake";
  private articles: unknown[];
  private failure: Error | null = null;

  constructor(articles: readonly unknown[] = SAMPLE_ARTICLES) {
    this.articles = [...articles];
  }

  /** Para os testes: muda o que o "ERP" devolve ou faz falhar a próxima leitura. */
  setArticles(articles: readonly unknown[]) {
    this.articles = [...articles];
  }

  failWith(error: Error | null) {
    this.failure = error;
  }

  async listArticles(): Promise<unknown[]> {
    if (this.failure) throw this.failure;
    return structuredClone(this.articles);
  }
}
