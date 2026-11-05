import { describe, expect, it } from "vitest";
import { anonymizedEmail, currentConsent, erasureBlocker, isAnonymized } from "@/lib/privacy";

const base = { role: "cliente", email: "a@b.pt", isSelf: false, openOrders: 0 };

describe("erasureBlocker", () => {
  it("deixa apagar um cliente sem encomendas em curso", () => {
    expect(erasureBlocker(base)).toBeNull();
  });

  it("recusa a própria conta, admins, contas já apagadas e encomendas em curso", () => {
    expect(erasureBlocker({ ...base, isSelf: true })).toMatch(/própria/);
    expect(erasureBlocker({ ...base, role: "admin" })).toMatch(/administrador/);
    expect(erasureBlocker({ ...base, email: anonymizedEmail("x") })).toMatch(/já foi apagada/);
    expect(erasureBlocker({ ...base, openOrders: 1 })).toMatch(/1 encomenda em curso/);
    expect(erasureBlocker({ ...base, openOrders: 3 })).toMatch(/3 encomendas em curso/);
  });
});

describe("anonymizedEmail", () => {
  it("é único por conta e reconhecível", () => {
    const email = anonymizedEmail("0b0e…");
    expect(email).not.toBe(anonymizedEmail("outro"));
    expect(isAnonymized(email)).toBe(true);
    expect(isAnonymized("cliente@gmail.com")).toBe(false);
  });
});

describe("currentConsent", () => {
  const at = (iso: string) => new Date(iso);
  it("vale a resposta mais recente", () => {
    const rows = [
      { type: "marketing", granted: true, createdAt: at("2026-01-01") },
      { type: "marketing", granted: false, createdAt: at("2026-03-01") },
      { type: "terms", granted: true, createdAt: at("2026-04-01") },
    ];
    expect(currentConsent(rows, "marketing")).toBe(false);
    expect(currentConsent(rows, "terms")).toBe(true);
  });

  it("sem resposta devolve null", () => {
    expect(currentConsent([], "marketing")).toBeNull();
  });
});
