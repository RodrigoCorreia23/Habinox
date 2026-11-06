import { describe, expect, it } from "vitest";
import { suggestVarName } from "@/lib/options";

describe("suggestVarName", () => {
  it("convenções da oficina", () => {
    expect(suggestVarName("Largura da caixa", [])).toBe("L");
    expect(suggestVarName("Altura da caixa", ["L"])).toBe("H");
    expect(suggestVarName("Diâmetro do tubo", [])).toBe("D");
  });

  it("senão, a primeira letra livre das palavras", () => {
    expect(suggestVarName("Número de folhas", [])).toBe("N");
    expect(suggestVarName("Largura da porta", ["L"])).toBe("P");
  });

  it("sem letra livre devolve null", () => {
    expect(suggestVarName("Largura", ["L"])).toBeNull();
  });
});
