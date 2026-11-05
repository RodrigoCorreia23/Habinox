"use client";

/**
 * Preço de exemplo do editor: os controlos das opções (pré-preenchidos com o
 * meio do intervalo ou o que vem escolhido) e o talão do preço, recalculado
 * sozinho 400 ms depois da última mudança e sempre que a fórmula muda (stamp).
 * A partir de xl vive na coluna direita; abaixo, numa barra fixa em baixo que
 * abre uma folha.
 */
import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronUp } from "lucide-react";
import { Select, UnitInput, fieldClass } from "@/components/admin/field";
import { Notice } from "@/components/admin/notice";
import { PriceTicket } from "@/components/admin/price-ticket";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { formatEuros } from "@/lib/money";
import { previewAction } from "../formula-actions";
import type { PreviewResult, SampleInput } from "../preview";

export type SampleOption = {
  key: string;
  name: string;
  type: "dimension" | "number" | "choice" | "boolean";
  values: { key: string; label: string }[];
};

const quantityFormat = new Intl.NumberFormat("pt-PT", {
  useGrouping: "always",
  maximumFractionDigits: 3,
});

function Controls({
  options,
  input,
  onChange,
  idPrefix,
}: {
  options: SampleOption[];
  input: SampleInput;
  onChange: (key: string, value: string | boolean) => void;
  idPrefix: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-3">
      {options.map((option) => {
        const id = `${idPrefix}-${option.key}`;
        const value = input[option.key];
        if (option.type === "boolean") {
          return (
            <label
              key={option.key}
              className="text-ink col-span-2 flex min-h-9 items-center gap-2 text-sm pointer-coarse:min-h-11"
            >
              <input
                type="checkbox"
                checked={value === true}
                onChange={(event) => onChange(option.key, event.target.checked)}
                className="size-4"
              />
              {option.name}
            </label>
          );
        }
        return (
          <label
            key={option.key}
            htmlFor={id}
            className={`grid min-w-0 gap-1 text-[13px] ${option.type === "choice" ? "col-span-2" : ""}`}
          >
            <span className="text-ink font-medium">{option.name}</span>
            {option.type === "choice" ? (
              <Select
                id={id}
                value={typeof value === "string" ? value : ""}
                onChange={(event) => onChange(option.key, event.target.value)}
                className="h-9"
              >
                <option value="">—</option>
                {option.values.map((choice) => (
                  <option key={choice.key} value={choice.key}>
                    {choice.label}
                  </option>
                ))}
              </Select>
            ) : option.type === "dimension" ? (
              <UnitInput
                id={id}
                unit="mm"
                value={typeof value === "string" ? value : ""}
                onChange={(event) => onChange(option.key, event.target.value)}
                className="h-9"
              />
            ) : (
              <input
                id={id}
                inputMode="decimal"
                value={typeof value === "string" ? value : ""}
                onChange={(event) => onChange(option.key, event.target.value)}
                className={`${fieldClass} h-9 w-full text-right tabular-nums`}
              />
            )}
          </label>
        );
      })}
    </div>
  );
}

function Ticket({
  result,
  lineAnchors,
  pending,
}: {
  result: PreviewResult;
  lineAnchors: string[];
  pending: boolean;
}) {
  if (result === null) return null;
  if (!result.ok) {
    const first = result.errors[0]!;
    const anchor = first.sourceIndex === null ? undefined : lineAnchors[first.sourceIndex];
    return (
      <Notice
        tone="danger"
        title={
          first.sourceIndex === null
            ? "Não consigo calcular com estes valores"
            : `Não consigo calcular: a linha ${first.sourceIndex + 1} tem um erro`
        }
        action={
          anchor ? (
            <a href={`#${anchor}`} className="link-admin text-sm">
              Ver a linha
            </a>
          ) : undefined
        }
      >
        <ul className="grid gap-0.5">
          {result.errors.slice(0, 3).map((error) => (
            <li key={error.message}>{error.message}</li>
          ))}
        </ul>
      </Notice>
    );
  }
  if (result.lines.length === 0) {
    return (
      <p className="text-steel text-sm">
        Ainda não há linhas de custo: o preço aparece quando acrescentar a primeira.
      </p>
    );
  }
  const rows = [
    ...result.lines.map((line) => ({
      label: line.label,
      detail: `${quantityFormat.format(Number(line.quantity))} ${line.unit} · ${line.itemName}`,
      amountCents: line.priceCents,
      href:
        line.sourceIndex === null || !lineAnchors[line.sourceIndex]
          ? undefined
          : `#${lineAnchors[line.sourceIndex]}`,
    })),
    ...(result.consumables
      ? [
          {
            label: "Consumíveis",
            detail: `${quantityFormat.format(Number(result.consumables.rate) * 100)} % dos materiais`,
            amountCents: result.consumables.priceCents,
            href: "#consumiveis",
          },
        ]
      : []),
  ];
  return (
    <div aria-busy={pending || undefined} className={pending ? "opacity-70" : undefined}>
      <PriceTicket
        title="Preço na loja"
        rows={rows}
        totals={{
          netCents: result.netCents,
          vatRate: result.vatRate,
          totalCents: result.totalCents,
        }}
        internal={{ costCents: result.costCents, marginCents: result.marginCents }}
        className="border-0 p-0"
      />
    </div>
  );
}

export function SamplePrice({
  versionId,
  options,
  initialInput,
  initialResult,
  stamp,
  lineAnchors,
}: {
  versionId: string;
  options: SampleOption[];
  initialInput: SampleInput;
  initialResult: PreviewResult;
  /** Muda quando a fórmula, as opções ou os custos mudam: recalcula. */
  stamp: string;
  /** Id da linha de custo (para #id) por posição. */
  lineAnchors: string[];
}) {
  // O que o Bruno mudou; o resto vem dos valores de partida (também para opções novas).
  const [edited, setEdited] = useState<SampleInput>({});
  const [result, setResult] = useState<PreviewResult>(initialResult);
  const [pending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const request = useRef(0);
  const first = useRef(true);

  const input: SampleInput = Object.fromEntries(
    options.map((option) => [
      option.key,
      option.key in edited ? edited[option.key]! : (initialInput[option.key] ?? ""),
    ]),
  );
  const inputKey = JSON.stringify(input);

  // Recalcula 400 ms depois da última mudança; uma resposta antiga nunca tapa uma nova.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const id = ++request.current;
      const formData = new FormData();
      for (const [key, value] of Object.entries(JSON.parse(inputKey) as SampleInput)) {
        if (value === true) formData.set(key, "on");
        else if (typeof value === "string") formData.set(key, value);
      }
      startTransition(async () => {
        const next = await previewAction(versionId, null, formData);
        if (id === request.current) setResult(next);
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [inputKey, stamp, versionId]);

  const change = (key: string, value: string | boolean) =>
    setEdited((current) => ({ ...current, [key]: value }));

  const body = (idPrefix: string) => (
    <div className="grid gap-5">
      <Controls options={options} input={input} onChange={change} idPrefix={idPrefix} />
      <div className="border-line-soft border-t pt-4">
        <Ticket result={result} lineAnchors={lineAnchors} pending={pending} />
      </div>
      <p className="text-steel text-[13px]/[18px]">
        {pending
          ? "A calcular…"
          : "Com os custos e as margens de hoje. Mude os valores para testar; não grava nada."}
      </p>
    </div>
  );

  const total = result?.ok ? formatEuros(result.totalCents) : null;

  return (
    <>
      {/* xl: coluna direita fixa */}
      <aside
        aria-labelledby="preco-exemplo-titulo"
        className="bg-surface border-line hidden rounded-[2px] border p-5 xl:sticky xl:top-20 xl:block xl:max-h-[calc(100dvh-6rem)] xl:overflow-y-auto"
      >
        <h2 id="preco-exemplo-titulo" className="text-ink mb-4 text-[15px]/[22px] font-semibold">
          Preço de exemplo
        </h2>
        {body("exemplo")}
      </aside>

      {/* Abaixo de xl: barra fixa em baixo que abre a folha */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <div className="bg-surface/95 border-line fixed inset-x-0 bottom-0 z-10 border-t px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-sm lg:left-[240px] xl:hidden">
          <SheetTrigger asChild>
            <button
              type="button"
              className="hover:bg-surface-alt focus-visible:ring-amber-ink flex h-12 w-full items-center justify-between gap-3 rounded-[2px] px-2 text-left outline-none focus-visible:ring-2"
            >
              <span className="text-steel text-sm">Preço de exemplo</span>
              <span className="text-ink flex items-center gap-2 text-lg font-semibold tabular-nums">
                {pending ? "A calcular…" : (total ?? "Não se calcula")}
                <ChevronUp aria-hidden className="text-steel size-5" strokeWidth={1.75} />
              </span>
            </button>
          </SheetTrigger>
        </div>
        <SheetContent
          side="bottom"
          aria-describedby={undefined}
          className="px-4 pt-4 pb-6"
          onClickCapture={(event) => {
            // Ligações para uma linha de custo: fechar a folha para se ver a linha.
            if ((event.target as HTMLElement).closest("a[href^='#']")) setSheetOpen(false);
          }}
        >
          <SheetTitle className="mb-4 pr-12 text-[15px]">Preço de exemplo</SheetTitle>
          {body("exemplo-folha")}
        </SheetContent>
      </Sheet>
    </>
  );
}
