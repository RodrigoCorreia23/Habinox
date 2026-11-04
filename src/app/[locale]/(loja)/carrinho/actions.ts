"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { log } from "@/lib/log";
import { type AddResult, addToCart, removeItem, setItemQuantity } from "@/server/store/cart";
import { getCurrentCart } from "@/server/store/current-cart";

const inputSchema = z.record(
  z.string().regex(/^[a-z][a-z0-9_]*$/),
  z.union([z.string().max(80), z.number().finite(), z.boolean()]),
);

export async function addToCartAction(
  productId: string,
  locale: string,
  input: unknown,
  quantity: number,
): Promise<AddResult> {
  const parsedInput = inputSchema.safeParse(input);
  if (
    !z.uuid().safeParse(productId).success ||
    !parsedInput.success ||
    !Number.isFinite(quantity)
  ) {
    return { ok: false, reason: "invalid" };
  }
  try {
    const cart = await getCurrentCart({ create: true });
    const result = await addToCart(cart!.id, productId, parsedInput.data, quantity, locale);
    if (result.ok) {
      log.info("cart.item_added", { cartId: cart!.id, productId });
      revalidatePath("/[locale]", "layout");
    }
    return result;
  } catch (error) {
    log.error("cart.add_failed", { productId, error });
    return { ok: false, reason: "invalid" };
  }
}

export async function setQuantityAction(itemId: string, formData: FormData) {
  const quantity = Number(formData.get("quantity"));
  if (!z.uuid().safeParse(itemId).success || !Number.isFinite(quantity)) return;
  const cart = await getCurrentCart();
  if (!cart) return;
  await setItemQuantity(cart.id, itemId, quantity);
  revalidatePath("/[locale]", "layout");
}

export async function removeItemAction(itemId: string) {
  if (!z.uuid().safeParse(itemId).success) return;
  const cart = await getCurrentCart();
  if (!cart) return;
  await removeItem(cart.id, itemId);
  log.info("cart.item_removed", { cartId: cart.id, itemId });
  revalidatePath("/[locale]", "layout");
}
