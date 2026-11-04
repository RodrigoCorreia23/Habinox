import { describe, expect, it } from "vitest";
import { isValidNif } from "@/lib/address";
import {
  canTransition,
  customerCanCancel,
  nextStatuses,
  onPaymentConfirmed,
  ORDER_STATUSES,
} from "@/lib/orders/state";

describe("máquina de estados das encomendas", () => {
  it("segue o caminho normal", () => {
    expect(canTransition("pending_payment", "paid")).toBe(true);
    expect(canTransition("paid", "in_production")).toBe(true);
    expect(canTransition("in_production", "ready")).toBe(true);
    expect(canTransition("ready", "shipped")).toBe(true);
    expect(canTransition("shipped", "delivered")).toBe(true);
  });

  it.each([
    ["pending_payment", "shipped"],
    ["paid", "pending_payment"],
    ["delivered", "cancelled"],
    ["expired", "paid"],
    ["cancelled", "pending_payment"],
    ["in_production", "cancelled"],
  ] as const)("recusa %s → %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  it("estados finais não têm saída", () => {
    for (const status of ["delivered", "cancelled", "expired"] as const) {
      expect(nextStatuses(status)).toEqual([]);
    }
  });

  it("todos os estados estão definidos", () => {
    for (const status of ORDER_STATUSES) expect(Array.isArray(nextStatuses(status))).toBe(true);
  });

  it("pagamento confirmado", () => {
    expect(onPaymentConfirmed("pending_payment")).toEqual({ action: "mark_paid" });
    expect(onPaymentConfirmed("paid")).toEqual({ action: "ignore", reason: "already_paid" });
    expect(onPaymentConfirmed("shipped")).toEqual({ action: "ignore", reason: "already_paid" });
    // Multibanco pago depois de a encomenda expirar: nunca muda sozinho.
    expect(onPaymentConfirmed("expired")).toEqual({ action: "review", reason: "late_payment" });
    expect(onPaymentConfirmed("cancelled")).toEqual({
      action: "review",
      reason: "unexpected_status",
    });
  });

  it("o cliente só cancela antes de pagar", () => {
    expect(customerCanCancel("pending_payment")).toBe(true);
    expect(customerCanCancel("paid")).toBe(false);
  });
});

describe("NIF", () => {
  it.each(["123456789", "501964843", "245307273", "999999990"])("aceita %s", (nif) => {
    expect(isValidNif(nif)).toBe(true);
  });
  it.each(["123456780", "12345678", "abcdefghi", "023456789", "401234567"])("recusa %s", (nif) => {
    expect(isValidNif(nif)).toBe(false);
  });
});
