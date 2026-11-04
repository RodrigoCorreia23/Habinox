import { describe, expect, it } from "vitest";
import { parseDecimal } from "@/lib/money";
import type { ProductOptionDef } from "@/lib/options";
import { calculatePrice, type PricedItem, type PricingInput } from "@/lib/pricing";

const item = (code: string, unitCost: string, margin: string | null): PricedItem => ({
  code,
  name: code,
  unitCost: parseDecimal(unitCost),
  margin: margin === null ? null : parseDecimal(margin),
});

const options: ProductOptionDef[] = [
  { key: "largura", type: "dimension", var: "L", required: true },
  { key: "altura", type: "dimension", var: "H", required: true },
  {
    key: "material",
    type: "choice",
    required: true,
    values: [{ key: "ferro" }, { key: "inox" }, { key: "aluminio" }],
  },
  {
    key: "acabamento",
    type: "choice",
    required: true,
    values: [{ key: "lacado" }, { key: "escovado" }],
  },
  {
    key: "enchimento",
    type: "choice",
    required: true,
    values: [{ key: "barras" }, { key: "chapa" }],
  },
  { key: "motorizacao", type: "choice", required: false, values: [{ key: "motor" }] },
];

/** Portão de correr de exemplo (números fictícios, não são custos da Habinox). */
function gate(values: PricingInput["values"], overrides: Partial<PricingInput> = {}): PricingInput {
  return {
    options,
    values,
    consumablesRate: parseDecimal("0.10"),
    valueComponents: { motorizacao: { motor: item("MOT400", "535", "0") } },
    lines: [
      {
        label: "Tubo do quadro",
        kind: "material",
        quantityExpr: "2 × (L + H)",
        unit: "m",
        itemByOption: {
          option: "material",
          items: {
            ferro: item("TF4040", "3.2000", "0.30"),
            inox: item("TI4040", "12.4000", "0.25"),
          },
        },
      },
      {
        label: "Barras",
        kind: "material",
        quantityExpr: "ceil(L / 0,12) × H",
        unit: "m",
        conditions: [{ option: "enchimento", op: "eq", value: "barras" }],
        itemByOption: {
          option: "material",
          items: { ferro: item("TFB20", "1.1000", "0.30"), inox: item("TIB20", "4.0000", "0.25") },
        },
      },
      {
        label: "Lacagem",
        kind: "external",
        quantityExpr: "L × H",
        unit: "m²",
        conditions: [{ option: "acabamento", op: "eq", value: "lacado" }],
        item: item("LAC", "22.0000", "0.10"),
      },
      {
        label: "Serralharia",
        kind: "labour",
        quantityExpr: "6 + 2,4 × L + 0,9 × L × H",
        unit: "h",
        item: item("SERR", "23.50", "0.20"),
      },
    ],
    ...overrides,
  };
}

const ferroLacado = {
  largura: 4000,
  altura: 1600,
  material: "ferro",
  acabamento: "lacado",
  enchimento: "barras",
  motorizacao: "motor",
};

describe("calculatePrice", () => {
  it("portão de correr 4 000 × 1 600, ferro lacado, barras, motor", () => {
    const result = calculatePrice(gate(ferroLacado));
    if (!result.ok) throw new Error(JSON.stringify(result.errors));

    // Contas à mão:
    // tubo   2 × 5,6 = 11,2 m × 3,20 = 35,84 € × 1,30 = 46,592  → 46,59
    // barras ceil(33,3) = 34 × 1,6 = 54,4 m × 1,10 = 59,84 € × 1,30 = 77,792 → 77,79
    // lacagem 6,4 m² × 22 = 140,80 € × 1,10 = 154,88
    // serralharia 6 + 9,6 + 5,76 = 21,36 h × 23,50 = 501,96 € × 1,20 = 602,352 → 602,35
    // motor 535 € × 1,00 = 535,00
    // consumíveis 10% de 95,68 = 9,568 €; com margem 4,6592 + 7,7792 = 12,4384 → 12,44
    expect(result.lines.map((line) => [line.label, line.costCents, line.priceCents])).toEqual([
      ["Tubo do quadro", 3584, 4659],
      ["Barras", 5984, 7779],
      ["Lacagem", 14080, 15488],
      ["Serralharia", 50196, 60235],
      ["MOT400", 53500, 53500],
    ]);
    expect(result.consumables).toEqual({ rate: "0.10000000", costCents: 957, priceCents: 1244 });
    expect(result.netCents).toBe(142905);
  });

  it("guarda no snapshot o artigo, a quantidade, o custo e a margem usados", () => {
    const result = calculatePrice(gate(ferroLacado));
    if (!result.ok) throw new Error("falhou");
    expect(result.lines[0]).toEqual({
      label: "Tubo do quadro",
      kind: "material",
      unit: "m",
      quantity: "11.20000000",
      itemCode: "TF4040",
      itemName: "TF4040",
      unitCost: "3.20000000",
      margin: "0.30000000",
      costCents: 3584,
      priceCents: 4659,
    });
  });

  it("o artigo e a margem mudam com o material", () => {
    const result = calculatePrice(
      gate({
        largura: 4000,
        altura: 1600,
        material: "inox",
        acabamento: "escovado",
        enchimento: "barras",
      }),
    );
    if (!result.ok) throw new Error("falhou");
    expect(result.lines.map((line) => line.label)).toEqual([
      "Tubo do quadro",
      "Barras",
      "Serralharia",
    ]);
    expect(result.lines[0]?.itemCode).toBe("TI4040");
    // 11,2 × 12,40 = 138,88 × 1,25 = 173,60
    expect(result.lines[0]?.priceCents).toBe(17360);
  });

  it("linhas condicionadas: chapa em vez de barras", () => {
    const result = calculatePrice(gate({ ...ferroLacado, enchimento: "chapa" }));
    if (!result.ok) throw new Error("falhou");
    expect(result.lines.some((line) => line.label === "Barras")).toBe(false);
  });

  it("sem artigo para o material escolhido, a combinação não está disponível", () => {
    const result = calculatePrice(gate({ ...ferroLacado, material: "aluminio" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => [error.code, error.source])).toEqual([
      ["unavailable", "Tubo do quadro"],
      ["unavailable", "Barras"],
    ]);
  });

  it("não calcula com margem por decidir", () => {
    const input = gate(ferroLacado, {
      valueComponents: { motorizacao: { motor: item("MOT400", "535", null) } },
    });
    const result = calculatePrice(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([
      { code: "margin_undefined", source: "MOT400", message: 'Margem por decidir em "MOT400"' },
    ]);
  });

  it("margem 0 explícita entra ao custo", () => {
    const result = calculatePrice(gate(ferroLacado));
    if (!result.ok) throw new Error("falhou");
    expect(result.lines.find((line) => line.itemCode === "MOT400")?.priceCents).toBe(53500);
  });

  it("recusa quantidades negativas e expressões inválidas", () => {
    const result = calculatePrice(
      gate(ferroLacado, {
        lines: [
          {
            label: "Negativa",
            kind: "labour",
            quantityExpr: "1 - L",
            unit: "h",
            item: item("S", "10", "0"),
          },
          {
            label: "Partida",
            kind: "labour",
            quantityExpr: "2 * (L",
            unit: "h",
            item: item("S", "10", "0"),
          },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => [error.code, error.source])).toEqual([
      ["negative_quantity", "Negativa"],
      ["expression", "Partida"],
    ]);
  });
});

describe("escada: variáveis calculadas", () => {
  const stairOptions: ProductOptionDef[] = [
    { key: "altura_pisos", type: "dimension", var: "H", required: true },
    { key: "projecao", type: "dimension", var: "P", required: true },
    { key: "largura", type: "dimension", var: "W", required: true },
    {
      key: "corrimao",
      type: "choice",
      required: true,
      values: [
        { key: "um_lado", params: { lados: 1 } },
        { key: "dois_lados", params: { lados: 2 } },
      ],
    },
    { key: "patamar", type: "dimension", var: "PT", required: false },
  ];

  const stair = (values: PricingInput["values"]): PricingInput => ({
    options: stairOptions,
    values,
    consumablesRate: parseDecimal("0"),
    variables: [
      { name: "degraus", expr: "ceil(H / 0,18)" },
      { name: "viga", expr: "sqrt(H*H + P*P)" },
      { name: "patamar_m2", expr: "PT * W" },
    ],
    lines: [
      {
        label: "Viga",
        kind: "material",
        quantityExpr: "2 × viga",
        unit: "m",
        item: item("V150", "10", "0"),
      },
      {
        label: "Corrimão",
        kind: "material",
        quantityExpr: "corrimao.lados × viga",
        unit: "m",
        item: item("C50", "10", "0"),
      },
      {
        label: "Serralharia",
        kind: "labour",
        quantityExpr: "8 + 0,6 × degraus",
        unit: "h",
        item: item("S", "20", "0"),
      },
    ],
  });

  it("calcula degraus e viga, usa os parâmetros do valor escolhido", () => {
    const result = calculatePrice(
      stair({ altura_pisos: 2700, projecao: 3600, largura: 900, corrimao: "dois_lados" }),
    );
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    // degraus = ceil(2,7 / 0,18) = 15; viga = sqrt(2,7² + 3,6²) = 4,5
    expect(result.variables.degraus).toBe(15);
    expect(result.variables.viga).toBeCloseTo(4.5, 12);
    // viga 9 m × 10 = 90; corrimão 2 × 4,5 = 9 m × 10 = 90; serralharia 17 h × 20 = 340
    expect(result.netCents).toBe(52000);
  });

  it("variável que usa uma medida em falta só é erro se alguma linha a usar", () => {
    const result = calculatePrice(
      stair({ altura_pisos: 2700, projecao: 3600, largura: 900, corrimao: "um_lado" }),
    );
    expect(result.ok).toBe(true);
  });
});
