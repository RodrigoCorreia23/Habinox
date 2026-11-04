/**
 * Regras das imagens do catálogo (tamanhos em docs/estado.md › "Imagens e R2").
 * Uma categoria tem uma imagem que serve o mosaico 4:3 (página inicial) e a capa
 * panorâmica 12:5 (página da categoria), recortadas à volta do ponto de foco.
 * Um produto tem uma imagem para o cartão 4:5.
 */
import { z } from "zod";

export interface ImageSlot {
  minWidth: number;
  minHeight: number;
  /** Proporções em que a imagem é mostrada (largura/altura), para a pré-visualização. */
  crops: { label: string; ratio: number }[];
}

export const IMAGE_SLOTS = {
  category: {
    minWidth: 2400,
    minHeight: 1000,
    crops: [
      { label: "Mosaico 4:3", ratio: 4 / 3 },
      { label: "Capa 12:5", ratio: 12 / 5 },
    ],
  },
  product: { minWidth: 960, minHeight: 1200, crops: [{ label: "Cartão 4:5", ratio: 4 / 5 }] },
} as const satisfies Record<string, ImageSlot>;

export type ImageSlotKey = keyof typeof IMAGE_SLOTS;

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Mensagem de erro se a imagem for pequena demais para o tipo; null se servir. */
export function checkImageSize(slot: ImageSlotKey, width: number, height: number): string | null {
  const { minWidth, minHeight } = IMAGE_SLOTS[slot];
  if (width >= minWidth && height >= minHeight) return null;
  return `A imagem tem ${width} × ${height} px; o mínimo é ${minWidth} × ${minHeight} px.`;
}

/** Ponto de foco em percentagem (0–100), guardado com a imagem. */
export const focusSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});
export type Focus = z.infer<typeof focusSchema>;
export const CENTER: Focus = { x: 50, y: 50 };

/** Valor de `object-position` para recortar à volta do foco. */
export function objectPosition(focus: Focus | null | undefined): string {
  const f = focus ?? CENTER;
  return `${Math.round(f.x)}% ${Math.round(f.y)}%`;
}
