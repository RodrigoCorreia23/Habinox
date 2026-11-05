import { describe, expect, it } from "vitest";
import { valueFromArticle } from "@/lib/options";

describe("valueFromArticle", () => {
  it("separa o código RAL do nome", () => {
    expect(valueFromArticle("RAL 7016 Cinzento antracite")).toEqual({
      label: "Cinzento antracite",
      key: "ral_7016_cinzento_antracite",
      ralCode: "RAL 7016",
    });
    expect(valueFromArticle("Preto - RAL9005").ralCode).toBe("RAL 9005");
    expect(valueFromArticle("Preto - RAL9005").label).toBe("Preto");
  });

  it("sem código RAL, fica o nome", () => {
    expect(valueFromArticle("Motor de correr 600 kg")).toEqual({
      label: "Motor de correr 600 kg",
      key: "motor_de_correr_600_kg",
      ralCode: "",
    });
  });

  it("só o código: o nome fica o código", () => {
    expect(valueFromArticle("RAL 9010").label).toBe("RAL 9010");
  });
});
