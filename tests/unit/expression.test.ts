import { describe, expect, it } from "vitest";
import { evaluate, ExpressionError, parseExpression, variablesOf } from "@/lib/pricing";

const run = (source: string, scope: Record<string, number> = {}) =>
  evaluate(parseExpression(source), scope);

describe("expressões", () => {
  it.each([
    ["2 + 3 * 4", 14],
    ["(2 + 3) * 4", 20],
    ["10 - 4 - 3", 3],
    ["12 / 4 / 3", 1],
    ["-2 * 3", -6],
    ["--2", 2],
    ["0,12 * 100", 12],
    ["2 × 3 − 1 ÷ 2", 5.5],
    ["min(3; 1; 2)", 1],
    ["max(3; 1; 2)", 3],
    ["ceil(2,1)", 3],
    ["floor(2,9)", 2],
    ["round(2,5)", 3],
    ["sqrt(9)", 3],
  ])("%s = %d", (source, expected) => {
    expect(run(source)).toBe(expected);
  });

  it("usa as variáveis e os parâmetros das opções", () => {
    expect(
      run("ceil(L / espacamento.valor) * H", { L: 4, H: 1.6, "espacamento.valor": 0.12 }),
    ).toBe(34 * 1.6);
  });

  it("ceil não conta uma unidade a mais por erro de float", () => {
    // 0,1 × 3 ÷ 0,3 = 1,0000000000000002 em float
    expect(run("ceil(0.1 * 3 / 0.3)")).toBe(1);
    expect(run("floor(0.6 / 0.12)")).toBe(5);
  });

  it("lista as variáveis usadas", () => {
    expect([...variablesOf(parseExpression("2 * (L + H) + ceil(x.y)"))].sort()).toEqual([
      "H",
      "L",
      "x.y",
    ]);
  });

  it.each([
    ["", "Expressão vazia"],
    ["2 +", "Expressão incompleta"],
    ["(2 + 3", 'Falta ")"'],
    ["2 3", "Símbolo inesperado"],
    ["L ^ 2", "Carácter não permitido"],
    ["process.exit(1)", "Função desconhecida"],
    ["constructor", "Variável desconhecida"],
    ["min(1,5)", "separe os argumentos com ;"],
    ["sqrt(1; 2)", "Número de argumentos errado"],
    ["1 / (L - L)", "Divisão por zero"],
    ["sqrt(-1)", "Raiz de número negativo"],
    ["x", "Variável desconhecida: x"],
    ["2 'a'", "Carácter não permitido"],
  ])("recusa %j", (source, message) => {
    expect(() => run(source, { L: 1 })).toThrow(message);
  });

  it("indica a posição do erro", () => {
    try {
      run("2 + y");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ExpressionError);
      expect((error as ExpressionError).position).toBe(4);
    }
  });

  it("limita o tamanho e o encadeamento", () => {
    expect(() => parseExpression("1+".repeat(300) + "1")).toThrow("caracteres");
    expect(() => parseExpression("(".repeat(60) + "1" + ")".repeat(60))).toThrow("encadeada");
  });
});
