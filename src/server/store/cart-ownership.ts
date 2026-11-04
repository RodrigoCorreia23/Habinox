/**
 * Que carrinho vale, conforme haja sessão e cookie. Puro (testável sem BD).
 *
 * - Com sessão: o carrinho é o da conta (o mais recente, se houver vários).
 *   Um carrinho anónimo do cookie junta-se a ele; se a conta não tinha
 *   carrinho, o anónimo passa a ser da conta. Os outros carrinhos da conta
 *   juntam-se também ao principal.
 * - Sem sessão: só um carrinho anónimo; o cookie de um carrinho que já é de
 *   uma conta é ignorado (quem usar o computador depois não o vê).
 * - O carrinho de outra conta nunca se mexe.
 */
export interface CartRef {
  id: string;
  userId: string | null;
  updatedAt: Date;
}

export interface CartPlan {
  /** Carrinho a usar (null = nenhum ainda). */
  cartId: string | null;
  /** Passa a pertencer ao utilizador. */
  attach: string | null;
  /** Carrinhos cujos artigos passam para `cartId` e que depois se apagam. */
  mergeFrom: string[];
}

export function planCart(params: {
  userId: string | null;
  cookieCart: CartRef | null;
  userCarts: readonly CartRef[];
}): CartPlan {
  const { userId, cookieCart, userCarts } = params;

  if (!userId) {
    const anonymous = cookieCart && cookieCart.userId === null ? cookieCart.id : null;
    return { cartId: anonymous, attach: null, mergeFrom: [] };
  }

  const own = [...userCarts]
    .filter((cart) => cart.userId === userId)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const anonymous = cookieCart && cookieCart.userId === null ? cookieCart : null;

  if (own.length === 0) {
    return anonymous
      ? { cartId: anonymous.id, attach: anonymous.id, mergeFrom: [] }
      : { cartId: null, attach: null, mergeFrom: [] };
  }

  const [main, ...others] = own;
  return {
    cartId: main!.id,
    attach: null,
    mergeFrom: [...(anonymous ? [anonymous.id] : []), ...others.map((cart) => cart.id)],
  };
}
