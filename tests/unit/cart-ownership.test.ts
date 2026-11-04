import { describe, expect, it } from "vitest";
import { type CartRef, planCart } from "@/server/store/cart-ownership";

const cart = (id: string, userId: string | null, minutesAgo = 0): CartRef => ({
  id,
  userId,
  updatedAt: new Date(Date.now() - minutesAgo * 60_000),
});

describe("planCart", () => {
  it("visitante: usa o carrinho anónimo do cookie", () => {
    expect(planCart({ userId: null, cookieCart: cart("a", null), userCarts: [] })).toEqual({
      cartId: "a",
      attach: null,
      mergeFrom: [],
    });
  });

  it("visitante com cookie de um carrinho que já é de uma conta: ignora-o", () => {
    expect(
      planCart({ userId: null, cookieCart: cart("a", "u1"), userCarts: [] }).cartId,
    ).toBeNull();
  });

  it("entra sem carrinho na conta: o anónimo passa a ser da conta", () => {
    expect(planCart({ userId: "u1", cookieCart: cart("a", null), userCarts: [] })).toEqual({
      cartId: "a",
      attach: "a",
      mergeFrom: [],
    });
  });

  it("entra com carrinho na conta: o anónimo junta-se ao da conta", () => {
    expect(
      planCart({ userId: "u1", cookieCart: cart("a", null), userCarts: [cart("c", "u1")] }),
    ).toEqual({ cartId: "c", attach: null, mergeFrom: ["a"] });
  });

  it("vários carrinhos da conta: fica o mais recente e juntam-se os outros", () => {
    expect(
      planCart({
        userId: "u1",
        cookieCart: null,
        userCarts: [cart("velho", "u1", 60), cart("novo", "u1", 1), cart("meio", "u1", 30)],
      }),
    ).toEqual({ cartId: "novo", attach: null, mergeFrom: ["meio", "velho"] });
  });

  it("idempotente: depois de juntar, não há mais nada a fazer", () => {
    expect(
      planCart({ userId: "u1", cookieCart: cart("c", "u1"), userCarts: [cart("c", "u1")] }),
    ).toEqual({
      cartId: "c",
      attach: null,
      mergeFrom: [],
    });
  });

  it("nunca mexe no carrinho de outra conta", () => {
    const plan = planCart({
      userId: "u1",
      cookieCart: cart("x", "u2"),
      userCarts: [cart("c", "u1")],
    });
    expect(plan).toEqual({ cartId: "c", attach: null, mergeFrom: [] });
  });
});
