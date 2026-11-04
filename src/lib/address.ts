/** Validações de moradas e dados fiscais portugueses (no beta só se vende em Portugal). */
import { z } from "zod";

/** NIF: 9 dígitos com dígito de controlo (módulo 11). */
export function isValidNif(value: string): boolean {
  const nif = value.replace(/\s/g, "");
  if (!/^\d{9}$/.test(nif)) return false;
  // Primeiros dígitos atribuídos: particulares (1–3), empresas (5, 6, 9), 45 e 7x.
  if (!/^([1235689]|45|7[0-24-57-9])/.test(nif)) return false;
  const digits = nif.split("").map(Number);
  const sum = digits.slice(0, 8).reduce((total, digit, index) => total + digit * (9 - index), 0);
  const check = 11 - (sum % 11);
  return digits[8] === (check >= 10 ? 0 : check);
}

export const POSTAL_CODE_PATTERN = /^\d{4}-\d{3}$/;

export const addressSchema = z.object({
  name: z.string().trim().min(2, "Escreva o nome").max(120),
  line1: z.string().trim().min(3, "Escreva a morada").max(200),
  line2: z.string().trim().max(200),
  postalCode: z.string().trim().regex(POSTAL_CODE_PATTERN, "Código postal no formato 0000-000"),
  city: z.string().trim().min(2, "Escreva a localidade").max(80),
  country: z.literal("PT"),
});

export type Address = z.infer<typeof addressSchema>;
