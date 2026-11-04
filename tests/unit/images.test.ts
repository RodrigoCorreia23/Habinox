import { describe, expect, it } from "vitest";
import { checkImageSize, focusSchema, objectPosition } from "@/lib/images";

describe("checkImageSize", () => {
  it("aceita imagens do tamanho mínimo ou maiores", () => {
    expect(checkImageSize("category", 2400, 1000)).toBeNull();
    expect(checkImageSize("category", 4000, 3000)).toBeNull();
    expect(checkImageSize("product", 960, 1200)).toBeNull();
  });

  it("recusa imagens pequenas, dizendo o tamanho e o mínimo", () => {
    expect(checkImageSize("category", 1920, 1080)).toBe(
      "A imagem tem 1920 × 1080 px; o mínimo é 2400 × 1000 px.",
    );
    expect(checkImageSize("product", 1200, 900)).not.toBeNull();
  });
});

describe("foco", () => {
  it("valida percentagens de 0 a 100", () => {
    expect(focusSchema.safeParse({ x: 0, y: 100 }).success).toBe(true);
    expect(focusSchema.safeParse({ x: -1, y: 50 }).success).toBe(false);
    expect(focusSchema.safeParse({ x: 50 }).success).toBe(false);
  });

  it("dá o object-position, ao centro por omissão", () => {
    expect(objectPosition({ x: 62.4, y: 30 })).toBe("62% 30%");
    expect(objectPosition(null)).toBe("50% 50%");
  });
});
