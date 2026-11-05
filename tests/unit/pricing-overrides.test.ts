import { describe, expect, it } from "vitest";
import { parseDecimal } from "@/lib/money";
import { applyOverride, calculatePrice, isStale, type PricedItem } from "@/lib/pricing";

const d = parseDecimal;
const tube: PricedItem = {
  code: "TI4040",
  name: "Tubo inox",
  unitCost: d("12.4"),
  margin: d("0.25"),
};

describe("applyOverride", () => {
  it("sem valores próprios fica o geral (e diz que é geral)", () => {
    expect(applyOverride(tube, undefined)).toEqual({
      ...tube,
      source: { cost: "general", margin: "general" },
    });
    expect(applyOverride(tube, { unitCost: null, margin: null }).unitCost).toBe(d("12.4"));
  });

  it("só a margem própria", () => {
    const item = applyOverride(tube, { unitCost: null, margin: d("0.4") });
    expect(item.unitCost).toBe(d("12.4"));
    expect(item.margin).toBe(d("0.4"));
    expect(item.source).toEqual({ cost: "general", margin: "product" });
  });

  it("custo e margem próprios; margem própria de 0 é válida", () => {
    const item = applyOverride(tube, { unitCost: d("10"), margin: d("0") });
    expect(item.unitCost).toBe(d("10"));
    expect(item.margin).toBe(d("0"));
    expect(item.source).toEqual({ cost: "product", margin: "product" });
  });

  it("uma margem própria resolve a margem geral por decidir", () => {
    const undecided: PricedItem = { ...tube, margin: null };
    expect(applyOverride(undecided, { unitCost: null, margin: d("0.3") }).margin).toBe(d("0.3"));
  });
});

describe("preço com valores próprios", () => {
  it("o motor usa-os e o snapshot regista a origem", () => {
    const result = calculatePrice({
      options: [
        {
          key: "largura",
          type: "dimension",
          var: "L",
          required: true,
          min: 1000,
          max: 6000,
          step: 10,
        },
      ],
      values: { largura: 2000 },
      lines: [
        {
          label: "Tubo",
          kind: "material",
          quantityExpr: "2 * L",
          unit: "m",
          item: applyOverride(tube, { unitCost: d("10"), margin: d("0.5") }),
        },
      ],
      consumablesRate: d("0"),
    });
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    // 4 m × 10,00 € = 40,00 € de custo; × 1,5 = 60,00 €
    expect(result.netCents).toBe(6000);
    expect(result.lines[0]?.source).toEqual({ cost: "product", margin: "product" });
  });
});

describe("isStale", () => {
  it("avisa só quando o ERP mudou desde que o custo foi fixado", () => {
    expect(isStale({ unitCost: d("10"), referenceCost: d("12.4") }, d("12.4"))).toBe(false);
    expect(isStale({ unitCost: d("10"), referenceCost: d("12.4") }, d("13"))).toBe(true);
    expect(isStale({ unitCost: null, referenceCost: d("12.4") }, d("13"))).toBe(false);
  });
});
