/**
 * Expressões das quantidades e das variáveis calculadas: `2 × (L + H)`,
 * `ceil(L / espacamento.valor) × H`, `sqrt(H*H + P*P)`.
 *
 * Parser próprio por descida recursiva. Nunca `eval`: só há números,
 * variáveis, + − × ÷, parênteses e as funções de FUNCTIONS.
 * Aceita vírgula decimal ("0,12"); por isso os argumentos separam-se com ";".
 */

const FUNCTIONS = {
  min: { minArgs: 2, maxArgs: Infinity },
  max: { minArgs: 2, maxArgs: Infinity },
  ceil: { minArgs: 1, maxArgs: 1 },
  floor: { minArgs: 1, maxArgs: 1 },
  round: { minArgs: 1, maxArgs: 1 },
  sqrt: { minArgs: 1, maxArgs: 1 },
} as const;

type FunctionName = keyof typeof FUNCTIONS;

export type Expr =
  | { type: "num"; value: number }
  | { type: "var"; name: string; pos: number }
  | { type: "neg"; arg: Expr }
  | { type: "bin"; op: "+" | "-" | "*" | "/"; left: Expr; right: Expr; pos: number }
  | { type: "call"; fn: FunctionName; args: Expr[]; pos: number };

export class ExpressionError extends Error {
  constructor(
    message: string,
    readonly position: number,
  ) {
    super(message);
    this.name = "ExpressionError";
  }
}

const MAX_LENGTH = 500;
const MAX_DEPTH = 40;

type Token =
  | { kind: "num"; value: number; pos: number }
  | { kind: "id"; name: string; pos: number }
  | { kind: "op"; op: "+" | "-" | "*" | "/" | "(" | ")" | ";"; pos: number }
  | { kind: "end"; pos: number };

const OPERATORS: Record<string, "+" | "-" | "*" | "/" | "(" | ")" | ";"> = {
  "+": "+",
  "-": "-",
  "−": "-",
  "*": "*",
  "×": "*",
  "/": "/",
  "÷": "/",
  "(": "(",
  ")": ")",
  ";": ";",
};

const NUMBER = /\d+(?:[.,]\d+)?/y;
const IDENTIFIER = /[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?/y;

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const char = source[i]!;
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    const op = OPERATORS[char];
    if (op) {
      tokens.push({ kind: "op", op, pos: i });
      i++;
      continue;
    }
    NUMBER.lastIndex = i;
    const number = NUMBER.exec(source);
    if (number) {
      tokens.push({ kind: "num", value: Number(number[0].replace(",", ".")), pos: i });
      i += number[0].length;
      continue;
    }
    IDENTIFIER.lastIndex = i;
    const identifier = IDENTIFIER.exec(source);
    if (identifier) {
      tokens.push({ kind: "id", name: identifier[0], pos: i });
      i += identifier[0].length;
      continue;
    }
    throw new ExpressionError(`Carácter não permitido: "${char}"`, i);
  }
  tokens.push({ kind: "end", pos: source.length });
  return tokens;
}

export function parseExpression(source: string): Expr {
  if (source.length > MAX_LENGTH) {
    throw new ExpressionError(`Expressão com mais de ${MAX_LENGTH} caracteres`, 0);
  }
  const tokens = tokenize(source);
  let index = 0;
  let depth = 0;

  const peek = (): Token => tokens[index]!;
  const next = (): Token => tokens[index++]!;
  const isOp = (token: Token, op: string) => token.kind === "op" && token.op === op;

  const enter = (pos: number) => {
    if (++depth > MAX_DEPTH) throw new ExpressionError("Expressão demasiado encadeada", pos);
  };

  function expression(): Expr {
    let left = term();
    for (;;) {
      const token = peek();
      if (token.kind !== "op" || (token.op !== "+" && token.op !== "-")) return left;
      next();
      left = { type: "bin", op: token.op, left, right: term(), pos: token.pos };
    }
  }

  function term(): Expr {
    let left = unary();
    for (;;) {
      const token = peek();
      if (token.kind !== "op" || (token.op !== "*" && token.op !== "/")) return left;
      next();
      left = { type: "bin", op: token.op, left, right: unary(), pos: token.pos };
    }
  }

  function unary(): Expr {
    const token = peek();
    if (isOp(token, "-")) {
      next();
      enter(token.pos);
      const arg = unary();
      depth--;
      return { type: "neg", arg };
    }
    return primary();
  }

  function primary(): Expr {
    const token = next();
    if (token.kind === "num") return { type: "num", value: token.value };
    if (token.kind === "id") {
      if (!isOp(peek(), "(")) return { type: "var", name: token.name, pos: token.pos };
      if (!Object.hasOwn(FUNCTIONS, token.name)) {
        throw new ExpressionError(`Função desconhecida: ${token.name}`, token.pos);
      }
      const fn = token.name as FunctionName;
      next();
      enter(token.pos);
      const args: Expr[] = [expression()];
      while (isOp(peek(), ";")) {
        next();
        args.push(expression());
      }
      expect(")");
      depth--;
      const { minArgs, maxArgs } = FUNCTIONS[fn];
      if (args.length < minArgs || args.length > maxArgs) {
        const hint = minArgs > 1 ? " (separe os argumentos com ;)" : "";
        throw new ExpressionError(`Número de argumentos errado em ${fn}${hint}`, token.pos);
      }
      return { type: "call", fn, args, pos: token.pos };
    }
    if (isOp(token, "(")) {
      enter(token.pos);
      const inner = expression();
      expect(")");
      depth--;
      return inner;
    }
    if (token.kind === "end") throw new ExpressionError("Expressão incompleta", token.pos);
    throw new ExpressionError("Símbolo inesperado", token.pos);
  }

  function expect(op: string) {
    const token = next();
    if (!isOp(token, op)) throw new ExpressionError(`Falta "${op}"`, token.pos);
  }

  if (peek().kind === "end") throw new ExpressionError("Expressão vazia", 0);
  const result = expression();
  const rest = peek();
  if (rest.kind !== "end") throw new ExpressionError("Símbolo inesperado", rest.pos);
  return result;
}

/** Nomes das variáveis usadas, para validar no backoffice e saber dependências. */
export function variablesOf(expr: Expr, into = new Set<string>()): Set<string> {
  switch (expr.type) {
    case "var":
      into.add(expr.name);
      break;
    case "neg":
      variablesOf(expr.arg, into);
      break;
    case "bin":
      variablesOf(expr.left, into);
      variablesOf(expr.right, into);
      break;
    case "call":
      for (const arg of expr.args) variablesOf(arg, into);
      break;
  }
  return into;
}

/**
 * Antes de ceil/floor/round, encosta ao inteiro o que só difere por erro de float:
 * 0,1 × 3 ÷ 0,3 dá 1,0000000000000002 e ceil daria 2 (uma barra a mais).
 */
function snapToInteger(value: number): number {
  const nearest = Math.round(value);
  return Math.abs(value - nearest) < 1e-9 ? nearest : value;
}

export function evaluate(expr: Expr, scope: Readonly<Record<string, number>>): number {
  const result = evaluateNode(expr, scope);
  if (!Number.isFinite(result)) throw new ExpressionError("Resultado inválido", 0);
  return result;
}

function evaluateNode(expr: Expr, scope: Readonly<Record<string, number>>): number {
  switch (expr.type) {
    case "num":
      return expr.value;
    case "var": {
      if (!Object.hasOwn(scope, expr.name)) {
        throw new ExpressionError(`Variável desconhecida: ${expr.name}`, expr.pos);
      }
      return scope[expr.name]!;
    }
    case "neg":
      return -evaluateNode(expr.arg, scope);
    case "bin": {
      const left = evaluateNode(expr.left, scope);
      const right = evaluateNode(expr.right, scope);
      switch (expr.op) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          if (right === 0) throw new ExpressionError("Divisão por zero", expr.pos);
          return left / right;
      }
    }
    case "call": {
      const args = expr.args.map((arg) => evaluateNode(arg, scope));
      const first = args[0]!;
      switch (expr.fn) {
        case "min":
          return Math.min(...args);
        case "max":
          return Math.max(...args);
        case "ceil":
          return Math.ceil(snapToInteger(first));
        case "floor":
          return Math.floor(snapToInteger(first));
        case "round":
          return Math.round(snapToInteger(first));
        case "sqrt":
          if (first < 0) throw new ExpressionError("Raiz de número negativo", expr.pos);
          return Math.sqrt(first);
      }
    }
  }
}
