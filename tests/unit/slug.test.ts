import { describe, expect, it } from "vitest";
import { SLUG_PATTERN, slugify } from "@/lib/slug";

describe("slugify", () => {
  it.each([
    ["Portões de correr", "portoes-de-correr"],
    ["Chapéus de chaminé", "chapeus-de-chamine"],
    ["  Guardas / Guarda-corpos  ", "guardas-guarda-corpos"],
    ["Caixas de correio Nº 2", "caixas-de-correio-n-2"],
    ["Escadas çàíõ", "escadas-caio"],
    ["!!!", ""],
  ])("%j → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("produz sempre um slug válido ou vazio", () => {
    for (const input of ["Á-b--c", "x".repeat(200), "a - b"]) {
      const slug = slugify(input);
      expect(slug === "" || SLUG_PATTERN.test(slug)).toBe(true);
      expect(slug.length).toBeLessThanOrEqual(80);
    }
  });
});
