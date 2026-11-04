import * as pt from "./pt";
import type { LegalDocument } from "./pt";

export type LegalKey = "terms" | "privacy" | "cookies";

// Por língua; as outras entram com a internacionalização (por agora caem no português).
const DOCUMENTS: Record<string, Record<LegalKey, LegalDocument>> = { pt };

export function getLegalDocument(key: LegalKey, locale: string): LegalDocument {
  return (DOCUMENTS[locale] ?? DOCUMENTS.pt!)[key];
}
