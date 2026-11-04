import { describe, expect, it } from "vitest";
import { localize, localizedTextSchema } from "@/lib/localized";

describe("textos por língua", () => {
  it("usa a língua pedida e cai para o português", () => {
    const text = { pt: "Portão de correr", en: "Sliding gate" };
    expect(localize(text, "en")).toBe("Sliding gate");
    expect(localize(text, "de")).toBe("Portão de correr");
    expect(localize(text, "xx")).toBe("Portão de correr");
  });

  it("exige português e recusa línguas desconhecidas", () => {
    expect(localizedTextSchema.safeParse({ pt: "Portão" }).success).toBe(true);
    expect(localizedTextSchema.safeParse({ en: "Gate" }).success).toBe(false);
    expect(localizedTextSchema.safeParse({ pt: "  " }).success).toBe(false);
    expect(localizedTextSchema.safeParse({ pt: "Portão", be: "x" }).success).toBe(false);
  });
});
