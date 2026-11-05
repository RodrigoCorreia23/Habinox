/**
 * Consentimentos dados no registo (RGPD): termos e privacidade (obrigatório) e
 * contacto comercial (opcional, base do follow-up no CRM da fase 3). Chegam no
 * corpo do pedido de registo do Better Auth e ficam em `consents`.
 */
export const SIGN_UP_SOURCE = "sign_up";

export interface SignUpConsents {
  terms: boolean;
  marketing: boolean;
}

/** Lê os consentimentos do corpo do registo; só `true` conta como aceite. */
export function readSignUpConsents(body: unknown): SignUpConsents {
  const value = (body ?? {}) as Record<string, unknown>;
  return { terms: value.acceptTerms === true, marketing: value.acceptMarketing === true };
}

/** Linhas a gravar: o "não" ao contacto comercial também fica registado. */
export function signUpConsentRows(userId: string, consents: SignUpConsents) {
  return [
    { userId, type: "terms", granted: consents.terms, source: SIGN_UP_SOURCE },
    { userId, type: "marketing", granted: consents.marketing, source: SIGN_UP_SOURCE },
  ];
}
