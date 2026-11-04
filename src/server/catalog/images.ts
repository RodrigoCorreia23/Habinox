/**
 * Imagens das categorias e dos produtos: validar, converter e guardar.
 * O ficheiro é verificado pelo conteúdo (o sharp lê-o), não pelo nome nem pelo
 * tipo que o browser diz. Guarda-se em WebP, sem metadados (EXIF com GPS…),
 * já rodado conforme a orientação da câmara. O tamanho para cada ecrã é feito
 * depois pelo next/image.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import sharp, { type Metadata } from "sharp";
import { db } from "@/db/client";
import { categories, products } from "@/db/schema";
import { checkImageSize, type Focus, type ImageSlotKey, MAX_IMAGE_BYTES } from "@/lib/images";
import { log } from "@/lib/log";
import { getStorage, keyFromUrl, mediaUrl } from "@/server/storage";

const MAX_STORED_WIDTH: Record<ImageSlotKey, number> = { category: 3200, product: 2000 };
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);

export type ImageResult = { ok: true; url: string } | { ok: false; message: string };

async function convert(
  slot: ImageSlotKey,
  file: File,
): Promise<{ ok: true; body: Buffer } | { ok: false; message: string }> {
  if (file.size === 0) return { ok: false, message: "Escolha uma imagem." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, message: "A imagem tem mais de 10 MB." };
  const input = Buffer.from(await file.arrayBuffer());
  let meta: Metadata;
  try {
    meta = await sharp(input).metadata();
  } catch {
    return { ok: false, message: "O ficheiro não é uma imagem válida." };
  }
  if (!meta.format || !ACCEPTED_FORMATS.has(meta.format)) {
    return { ok: false, message: "Formato não aceite: use JPEG, PNG ou WebP." };
  }
  // Fotografias de telemóvel: a orientação vem no EXIF; as medidas reais são as rodadas.
  const rotated = (meta.orientation ?? 1) >= 5;
  const width = (rotated ? meta.height : meta.width) ?? 0;
  const height = (rotated ? meta.width : meta.height) ?? 0;
  const tooSmall = checkImageSize(slot, width, height);
  if (tooSmall) return { ok: false, message: tooSmall };

  const body = await sharp(input)
    .rotate()
    .resize({ width: MAX_STORED_WIDTH[slot], withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
  return { ok: true, body };
}

async function replace(
  slot: ImageSlotKey,
  id: string,
  file: File | null,
  focus: Focus,
): Promise<ImageResult> {
  const table = slot === "category" ? categories : products;
  const [row] = await db.select({ imageUrl: table.imageUrl }).from(table).where(eq(table.id, id));
  if (!row) return { ok: false, message: "Não encontrado." };

  // Só o foco muda: a imagem fica.
  if (!file) {
    if (!row.imageUrl) return { ok: false, message: "Escolha uma imagem." };
    await db.update(table).set({ imageFocus: focus }).where(eq(table.id, id));
    return { ok: true, url: row.imageUrl };
  }

  const converted = await convert(slot, file);
  if (!converted.ok) return converted;
  const key = `${slot === "category" ? "categorias" : "produtos"}/${randomUUID()}.webp`;
  const storage = getStorage();
  await storage.put(key, converted.body, "image/webp");
  const url = mediaUrl(key);
  await db.update(table).set({ imageUrl: url, imageFocus: focus }).where(eq(table.id, id));

  // A anterior já não é usada (os orçamentos guardam texto, não imagens).
  const oldKey = keyFromUrl(row.imageUrl);
  if (oldKey)
    await storage
      .delete(oldKey)
      .catch((error: unknown) => log.warn("image.delete_failed", { key: oldKey, error }));
  return { ok: true, url };
}

export async function setImage(slot: ImageSlotKey, id: string, file: File | null, focus: Focus) {
  return replace(slot, id, file, focus);
}

export async function removeImage(slot: ImageSlotKey, id: string): Promise<ImageResult> {
  const table = slot === "category" ? categories : products;
  const [row] = await db.select({ imageUrl: table.imageUrl }).from(table).where(eq(table.id, id));
  if (!row) return { ok: false, message: "Não encontrado." };
  await db.update(table).set({ imageUrl: null, imageFocus: null }).where(eq(table.id, id));
  const oldKey = keyFromUrl(row.imageUrl);
  if (oldKey) await getStorage().delete(oldKey);
  return { ok: true, url: "" };
}
