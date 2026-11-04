"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { log } from "@/lib/log";
import { requireUser } from "@/server/auth/session";
import { checkoutInputSchema, placeOrder } from "@/server/orders/place";
import { getCurrentCart } from "@/server/store/current-cart";

export type CheckoutState = {
  error?: "empty" | "unavailable" | "invalid" | "failed" | "price_changed";
  products?: string[];
  fieldErrors?: Record<string, string>;
} | null;

function address(formData: FormData, prefix: string) {
  return {
    name: formData.get(`${prefix}.name`) ?? "",
    line1: formData.get(`${prefix}.line1`) ?? "",
    line2: formData.get(`${prefix}.line2`) ?? "",
    postalCode: formData.get(`${prefix}.postalCode`) ?? "",
    city: formData.get(`${prefix}.city`) ?? "",
    country: "PT",
  };
}

export async function placeOrderAction(
  locale: string,
  _previous: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const session = await requireUser(`/${locale}/checkout`, locale);
  const sameShipping = formData.get("sameShipping") === "on";
  const parsed = checkoutInputSchema.safeParse({
    phone: formData.get("phone") ?? "",
    nif: formData.get("nif") ?? "",
    billing: address(formData, "billing"),
    sameShipping,
    shipping: sameShipping ? undefined : address(formData, "shipping"),
    notes: formData.get("notes") ?? "",
    acceptTerms: formData.get("acceptTerms") === "on",
    acceptMeasures: formData.get("acceptMeasures") === "on",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
    return { error: "invalid", fieldErrors };
  }

  const cart = await getCurrentCart();
  if (!cart) return { error: "empty" };

  let result;
  try {
    result = await placeOrder({
      cartId: cart.id,
      userId: session.user.id,
      email: session.user.email,
      input: parsed.data,
      locale,
      expectedTotalCents: Number(formData.get("expectedTotalCents")),
    });
  } catch (error) {
    log.error("order.place_failed", { userId: session.user.id, error });
    return { error: "failed" };
  }
  if (!result.ok) {
    // Preço mudou desde que a página abriu: a página volta a mostrar o valor certo.
    if (result.reason === "price_changed") revalidatePath(`/${locale}/checkout`);
    return { error: result.reason, products: result.products };
  }
  revalidatePath("/[locale]", "layout");
  redirect(`/${locale}/encomenda/${result.number}`);
}
