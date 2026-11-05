"use client";

/**
 * Campo de uma conta da fórmula (quantidade de uma linha ou conta auxiliar).
 * Fichas que inserem os nomes disponíveis (Largura L, Altura H, contas auxiliares)
 * e os operadores; verificação a cada tecla (validateFormula, sem esperar por
 * guardar) e o resultado ao vivo no exemplo: «Com Largura 3 500 mm e Altura
 * 1 500 mm → 10 m». Tudo puro (lib/pricing): nada vai ao servidor.
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CircleAlert } from "lucide-react";
import { Help } from "@/components/admin/help";
import { fieldClass } from "@/components/admin/field";
import type { ProductOptionDef } from "@/lib/options";
import { evaluate, parseExpression, validateFormula, variablesOf } from "@/lib/pricing";

export type ScopeName = {
  /** O nome usado nas contas (L, H, barras, material.espessura). */
  name: string;
  /** Como o Bruno o conhece (Largura, Número de barras). */
  label: string;
  kind: "measure" | "number" | "yesno" | "param" | "variable";
  /** Para as medidas: o valor do exemplo em mm. */
  sampleMm?: number;
};

const OPERATORS = [
  { text: " × ", label: "×", title: "vezes" },
  { text: " ÷ ", label: "÷", title: "a dividir por" },
  { text: " + ", label: "+", title: "mais" },
  { text: " − ", label: "−", title: "menos" },
  { text: "(", label: "(", title: "abrir parêntese" },
  { text: ")", label: ")", title: "fechar parêntese" },
];

const numberFormat = new Intl.NumberFormat("pt-PT", {
  useGrouping: "always",
  maximumFractionDigits: 3,
});

/** Mensagens do verificador em linguagem da oficina. */
function plain(message: string) {
  return message
    .replace(/^Variável desconhecida: (.+)$/, "«$1» não existe neste produto")
    .replace(/^"(.+)" não existe neste produto$/, "«$1» não existe neste produto")
    .replace(
      /^"(.+)" está definida mais abaixo: mova-a para cima$/,
      "«$1» está mais abaixo: suba-a",
    )
    .replace(/^Expressão vazia$/, "Escreva a conta")
    .replace(/^Símbolo inesperado$/, "Há um símbolo que não se percebe")
    .replace(/^Falta "(.)"$/, "Falta fechar «$1»");
}

export function ExpressionInput({
  name,
  label,
  defaultValue,
  placeholder,
  unit,
  names,
  options,
  variables,
  checkAs,
  scope,
  error,
}: {
  name: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
  /** Unidade do resultado («m», «h»…), para a frase do exemplo. */
  unit: string;
  names: ScopeName[];
  options: ProductOptionDef[];
  variables: { name: string; expr: string }[];
  /** Como verificar: linha de custo, ou a conta auxiliar na posição index. */
  checkAs: { kind: "line" } | { kind: "variable"; index: number };
  scope: Record<string, number>;
  error?: string;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [checked, setChecked] = useState(defaultValue);

  // Verificar 300 ms depois da última tecla (não a cada letra).
  useEffect(() => {
    const timer = setTimeout(() => setChecked(value), 300);
    return () => clearTimeout(timer);
  }, [value]);

  const { problems, result, used } = useMemo(() => {
    if (checked.trim() === "") return { problems: [], result: null, used: [] as string[] };
    const issues =
      checkAs.kind === "line"
        ? validateFormula({ options, variables, lines: [{ quantityExpr: checked }] }).filter(
            (issue) => issue.where.kind === "line",
          )
        : validateFormula({
            options,
            variables: [
              ...variables.slice(0, checkAs.index),
              { name: "__conta_em_edicao", expr: checked },
              ...variables.slice(checkAs.index + 1),
            ],
            lines: [],
          }).filter(
            (issue) => issue.where.kind === "variable" && issue.where.index === checkAs.index,
          );
    if (issues.length > 0) {
      return { problems: issues.map((issue) => plain(issue.message)), result: null, used: [] };
    }
    try {
      const expr = parseExpression(checked);
      return {
        problems: [],
        result: evaluate(expr, scope),
        used: [...variablesOf(expr)],
      };
    } catch {
      // Um nome que existe mas não tem valor neste exemplo (ex.: opção escondida).
      return { problems: [], result: null, used: [] };
    }
  }, [checked, checkAs, options, variables, scope]);

  const insert = (text: string) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + text + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      input?.focus();
      const caret = start + text.length;
      input?.setSelectionRange(caret, caret);
      // Os formulários contam alterações por «input»: o valor inserido também conta.
      input?.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };

  const byName = new Map(names.map((entry) => [entry.name, entry]));
  const measures = used
    .map((usedName) => byName.get(usedName))
    .filter((entry): entry is ScopeName => entry?.kind === "measure");
  const others = used
    .map((usedName) => byName.get(usedName))
    .filter((entry): entry is ScopeName => Boolean(entry) && entry!.kind !== "measure");
  const describedBy = problems.length > 0 || error ? `${id}-erro` : `${id}-resultado`;

  return (
    <div className="grid min-w-0 gap-2 text-sm">
      <label htmlFor={`${id}-campo`} className="text-ink font-medium">
        {label}
      </label>
      <input
        ref={inputRef}
        id={`${id}-campo`}
        name={name}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        required
        maxLength={500}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={problems.length > 0 || error ? true : undefined}
        aria-describedby={describedBy}
        className={`${fieldClass} w-full font-mono md:text-[15px]`}
      />
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-steel mr-1 text-[13px]">Inserir:</span>
        {names.map((entry) => (
          <button
            key={entry.name}
            type="button"
            onClick={() => insert(entry.name)}
            title={
              entry.kind === "measure"
                ? `${entry.label} em metros (${entry.name})`
                : `${entry.label} (${entry.name})`
            }
            className="border-line-strong hover:bg-surface-alt focus-visible:ring-amber-ink inline-flex h-8 items-center gap-1.5 rounded-[2px] border bg-white px-2 text-[13px] outline-none focus-visible:ring-2 pointer-coarse:h-10"
          >
            <span className="text-ink">{entry.label}</span>
            <span className="text-steel font-mono">{entry.name}</span>
          </button>
        ))}
        {OPERATORS.map((operator) => (
          <button
            key={operator.label}
            type="button"
            onClick={() => insert(operator.text)}
            aria-label={`Inserir ${operator.title}`}
            title={operator.title}
            className="border-line-strong hover:bg-surface-alt focus-visible:ring-amber-ink inline-flex size-8 items-center justify-center rounded-[2px] border bg-white font-mono text-[15px] outline-none focus-visible:ring-2 pointer-coarse:size-10"
          >
            {operator.label}
          </button>
        ))}
      </div>
      {problems.length > 0 || error ? (
        <p id={`${id}-erro`} className="text-danger flex items-start gap-1.5 text-[13px]/[18px]">
          <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
          <span>
            <span className="font-medium">Problema:</span> {problems[0] ?? error}
          </span>
        </p>
      ) : (
        <p id={`${id}-resultado`} aria-live="polite" className="text-steel text-[13px]/[18px]">
          {result === null ? (
            "Escreva a conta: o resultado no exemplo aparece aqui."
          ) : (
            <>
              {measures.length > 0 && (
                <>
                  Com{" "}
                  {measures
                    .map(
                      (entry) =>
                        `${entry.label} ${numberFormat.format(entry.sampleMm ?? (scope[entry.name] ?? 0) * 1000)} mm`,
                    )
                    .join(" e ")}
                  {others.length > 0 ? ", " : " "}
                </>
              )}
              {others.length > 0 && (
                <>
                  {measures.length === 0 && "Com "}
                  {others
                    .map(
                      (entry) =>
                        `${entry.label.toLowerCase()} = ${numberFormat.format(scope[entry.name] ?? 0)}`,
                    )
                    .join(", ")}{" "}
                </>
              )}
              →{" "}
              <span className="text-ink font-medium tabular-nums">
                {numberFormat.format(result)}
                {unit ? ` ${unit}` : ""}
              </span>
            </>
          )}
        </p>
      )}
      <Help title="Como se escrevem as contas?">
        <p>
          Use as fichas acima ou escreva os nomes. As medidas entram em metros: 3 500 mm conta como
          3,5.
        </p>
        <ul className="mt-2 grid gap-1">
          <li>
            <span className="font-mono">× ÷ + −</span> e parênteses, como numa calculadora. Casas
            decimais com vírgula: <span className="font-mono">0,12</span>.
          </li>
          <li>
            <span className="font-mono">ceil(…)</span> arredonda para cima (ex.: número de barras).
          </li>
          <li>
            <span className="font-mono">floor(…)</span> arredonda para baixo;{" "}
            <span className="font-mono">round(…)</span> ao inteiro mais próximo.
          </li>
          <li>
            <span className="font-mono">min(a; b)</span> e{" "}
            <span className="font-mono">max(a; b)</span> dão o menor e o maior (separe com ponto e
            vírgula).
          </li>
          <li>
            <span className="font-mono">sqrt(…)</span> é a raiz quadrada (ex.: a diagonal).
          </li>
        </ul>
      </Help>
    </div>
  );
}
