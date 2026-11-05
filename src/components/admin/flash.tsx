import { readFlash } from "@/server/admin/flash";
import { FlashToast } from "./flash-toast";

/**
 * Lê a mensagem deixada por setFlash() (cookie admin_flash) e passa-a ao cliente,
 * que mostra o toast e apaga o cookie. Vive dentro do PageHeader.
 */
export async function FlashSlot() {
  const flash = await readFlash();
  if (!flash) return null;
  return <FlashToast id={flash.id} tone={flash.tone} message={flash.message} />;
}
