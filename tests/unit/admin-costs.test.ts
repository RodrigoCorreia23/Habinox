import { describe, expect, it } from "vitest";
import {
  formatUnitCost,
  hourlyPriceCents,
  materialPriceWithMargin,
} from "@/app/admin/materiais/margin-price";
import {
  describeRunResult,
  describeSyncFailure,
  describeSyncSummary,
  formatUpcoming,
  nextAutomaticSync,
} from "@/app/admin/materiais/sync-messages";

// Espaços do Intl pt-PT (o separador antes do € é um espaço rígido).
const plain = (text: string | null) => text?.replace(/\s/g, " ");

describe("preço com margem (só para mostrar)", () => {
  it("soma a margem ao custo do ERP, como lib/pricing", () => {
    expect(plain(materialPriceWithMargin("4.0000", "30")?.price ?? null)).toBe("5,20 €");
    expect(plain(materialPriceWithMargin("12.4000", "12,5")?.price ?? null)).toBe("13,95 €");
    expect(materialPriceWithMargin("4.0000", "30")?.exact).toBeNull();
  });

  it("arredonda o preço ao cêntimo e guarda o valor exato para o title", () => {
    const price = materialPriceWithMargin("1.1000", "45");
    expect(plain(price?.price ?? null)).toBe("1,60 €");
    expect(plain(price?.exact ?? null)).toBe("1,595 €");
    expect(plain(materialPriceWithMargin("0.0123", "30")?.price ?? null)).toBe("0,02 €");
  });

  it("sem margem ou com margem inválida não mostra preço", () => {
    expect(materialPriceWithMargin("4.0000", "")).toBeNull();
    expect(materialPriceWithMargin("4.0000", "abc")).toBeNull();
  });

  it("mostra o custo com 2 a 4 casas", () => {
    expect(plain(formatUnitCost("1.1000"))).toBe("1,10 €");
    expect(plain(formatUnitCost("0.0125"))).toBe("0,0125 €");
  });

  it("preço por hora ao cliente em cêntimos", () => {
    expect(hourlyPriceCents("23,50", "20")).toBe(2820);
    expect(hourlyPriceCents("23,50", "")).toBeNull();
    expect(hourlyPriceCents("", "20")).toBeNull();
  });
});

describe("mensagens da sincronização", () => {
  const lastSync = new Date("2026-11-04T20:46:00Z");

  it("traduz erros conhecidos sem mostrar o texto técnico", () => {
    expect(describeSyncFailure([{ message: "401 Unauthorized" }], lastSync)).toMatch(
      /recusou o acesso/,
    );
    const timeout = describeSyncFailure([{ message: "fetch failed" }], lastSync);
    expect(timeout).toMatch(/não respondeu/);
    expect(timeout).toMatch(/4 nov 2026, 20:46/);
    expect(timeout).not.toMatch(/fetch failed/);
  });

  it("um erro desconhecido dá uma frase genérica com a saída", () => {
    const text = describeSyncFailure([{ message: "TypeError: x is undefined" }], null);
    expect(text).not.toMatch(/TypeError/);
    expect(text).toMatch(/Tente outra vez/);
  });

  it("resume o resultado de cada sincronização numa frase", () => {
    expect(describeRunResult({ status: "succeeded", items: 0, errors: [], lastSync })).toBe(
      "Correu bem: nada mudou",
    );
    expect(describeRunResult({ status: "succeeded", items: 2, errors: [], lastSync })).toBe(
      "Correu bem: 2 artigos atualizados",
    );
    expect(
      describeRunResult({ status: "failed", items: 0, errors: [{ message: "timeout" }], lastSync }),
    ).toBe("Falhou: o ERP não respondeu");
  });

  it("resume um «Sincronizar agora»", () => {
    expect(describeSyncSummary({ inserted: 0, costChanges: 0, missing: 0, errors: 0 })).toBe(
      "Sincronizado. Tudo igual: nenhum custo mudou.",
    );
    expect(describeSyncSummary({ inserted: 1, costChanges: 2, missing: 0, errors: 0 })).toBe(
      "Sincronizado: 2 custos mudaram, 1 artigo novo (falta a margem).",
    );
  });

  it("calcula a próxima sincronização automática a partir do cron diário", () => {
    const now = new Date("2026-11-05T10:00:00Z");
    const next = nextAutomaticSync(now);
    expect(next).not.toBeNull();
    expect(next!.getTime()).toBeGreaterThan(now.getTime());
    expect(next!.getTime() - now.getTime()).toBeLessThanOrEqual(86_400_000);
    expect(formatUpcoming(new Date("2026-11-06T04:00:00Z"), now)).toBe("amanhã às 04:00");
    expect(formatUpcoming(new Date("2026-11-05T15:00:00Z"), now)).toBe("hoje às 15:00");
  });
});
