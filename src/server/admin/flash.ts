import { cookies } from "next/headers";

/**
 * Mensagem de uma action que faz redirect («Categoria criada.»): fica num cookie
 * de vida curta e o FlashSlot do PageHeader mostra-a como toast na página seguinte.
 * Sem httpOnly porque o cliente apaga-o depois de o mostrar. Só texto, sem dados pessoais.
 */
export const FLASH_COOKIE = "admin_flash";

export type FlashTone = "ok" | "danger" | "info";
export type Flash = { id: string; tone: FlashTone; message: string };

export async function setFlash(tone: FlashTone, message: string) {
  const store = await cookies();
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  store.set(FLASH_COOKIE, JSON.stringify({ id, tone, message } satisfies Flash), {
    path: "/admin",
    maxAge: 60,
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

/** Lê (sem apagar) a mensagem pendente; devolve null se não houver ou estiver estragada. */
export async function readFlash(): Promise<Flash | null> {
  const raw = (await cookies()).get(FLASH_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Flash>;
    if (
      (parsed.tone === "ok" || parsed.tone === "danger" || parsed.tone === "info") &&
      typeof parsed.message === "string" &&
      parsed.message.length > 0
    ) {
      return {
        id: typeof parsed.id === "string" ? parsed.id.slice(0, 24) : parsed.message.slice(0, 24),
        tone: parsed.tone,
        message: parsed.message.slice(0, 300),
      };
    }
  } catch {
    // Cookie mexido à mão: ignora-se.
  }
  return null;
}
