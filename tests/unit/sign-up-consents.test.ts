import { describe, expect, it } from "vitest";
import { readSignUpConsents, signUpConsentRows } from "@/server/auth/sign-up-consents";

describe("readSignUpConsents", () => {
  it("só aceita true", () => {
    expect(readSignUpConsents({ acceptTerms: true, acceptMarketing: true })).toEqual({
      terms: true,
      marketing: true,
    });
    expect(readSignUpConsents({ acceptTerms: "true", acceptMarketing: "on" })).toEqual({
      terms: false,
      marketing: false,
    });
  });

  it("sem corpo não há consentimento", () => {
    expect(readSignUpConsents(undefined)).toEqual({ terms: false, marketing: false });
    expect(readSignUpConsents(null)).toEqual({ terms: false, marketing: false });
  });
});

describe("signUpConsentRows", () => {
  it("regista também o não ao contacto comercial", () => {
    expect(signUpConsentRows("u1", { terms: true, marketing: false })).toEqual([
      { userId: "u1", type: "terms", granted: true, source: "sign_up" },
      { userId: "u1", type: "marketing", granted: false, source: "sign_up" },
    ]);
  });
});
