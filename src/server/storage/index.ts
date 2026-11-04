/**
 * Armazenamento de ficheiros (imagens do catálogo; mais tarde GLB e ficheiros
 * técnicos). Atrás de uma interface, como as outras integrações: por agora só o
 * adaptador local (uma pasta fora do git); o Cloudflare R2 entra quando houver
 * conta. Fora de development, sem R2, recusa guardar: na Vercel o disco não é
 * persistente e as imagens perder-se-iam.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/env";

export interface StoredObject {
  body: Buffer;
  contentType: string;
}

export interface ObjectStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}

/** Chaves só com letras, números, - _ . e /, sem ".." (nunca sai da pasta). */
export const KEY_PATTERN = /^(?!.*\.\.)[a-z0-9][a-z0-9/_.-]*$/;

const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".png": "image/png",
};

class LocalStorage implements ObjectStorage {
  constructor(private readonly root: string) {}

  private file(key: string) {
    if (!KEY_PATTERN.test(key)) throw new Error(`Chave inválida: ${key}`);
    return path.join(this.root, key);
  }

  async put(key: string, body: Buffer) {
    const file = this.file(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
  }

  async get(key: string) {
    try {
      const body = await readFile(this.file(key));
      return { body, contentType: CONTENT_TYPES[path.extname(key)] ?? "application/octet-stream" };
    } catch {
      return null;
    }
  }

  async delete(key: string) {
    await rm(this.file(key), { force: true });
  }
}

let storage: ObjectStorage | null = null;

export function getStorage(): ObjectStorage {
  if (storage) return storage;
  if (env.NEXT_PUBLIC_APP_ENV !== "development") {
    throw new Error("Armazenamento não configurado: falta o adaptador R2 e as credenciais");
  }
  storage = new LocalStorage(path.resolve(env.STORAGE_DIR ?? ".data/uploads"));
  return storage;
}

/** URL pública de um ficheiro guardado (servido por /media/[...key]). */
export const mediaUrl = (key: string) => `/media/${key}`;
/** Chave a partir da URL pública, ou null se não for nossa. */
export const keyFromUrl = (url: string | null | undefined) =>
  url?.startsWith("/media/") ? url.slice("/media/".length) : null;
