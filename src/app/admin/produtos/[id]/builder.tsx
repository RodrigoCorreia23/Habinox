"use client";

/**
 * Construtor de produto: o Bruno monta o produto como o cliente o vê na loja —
 * divisões com os nomes que ele escolhe, as opções de cada uma e, em cada opção,
 * o artigo, como conta e a margem. Por cima, a «Base do produto» (o que entra
 * sempre e o cliente não vê). Cada campo guarda sozinho ao sair dele.
 */
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Copy, Plus, Ruler, Trash2, TriangleAlert } from "lucide-react";
import { cn } from "cn";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { fieldClass } from "@/components/admin/field";
import { SearchSelect } from "@/components/admin/search-select";
import { StatusBadge } from "@/components/admin/status-badge";
import { useToast } from "@/components/admin/toaster";
import { Button } from "@/components/ui/button";
import { centsToEuroInput, costToInput } from "@/lib/money";
import { fractionToPercent } from "@/lib/percent";
import {
  BASIS_LABEL,
  BASIS_NEEDS,
  BASES,
  type Basis,
  describeQuantity,
} from "@/lib/pricing/builder";
import type {
  BuilderCost,
  BuilderData,
  BuilderDivision,
  BuilderValue,
  Role,
} from "@/server/catalog/builder";
import {
  addDivisionAction,
  addValueAction,
  type BuilderState,
  copyDivisionAction,
  type CostPayload,
  removeBaseLineAction,
  removeDivisionAction,
  removeValueAction,
  renameValueAction,
  saveBaseLineAction,
  setDefaultValueAction,
  setValueCostAction,
  updateDivisionAction,
} from "../builder-actions";

export interface BuilderSources {
  articles: {
    id: string;
    name: string;
    code: string;
    unit: string;
    cost: string;
    family: string | null;
  }[];
  sectors: { id: string; name: string; rateCents: number }[];
}

interface Ctx {
  productId: string;
  versionId: string | null;
  sources: BuilderSources;
  hasWidth: boolean;
  hasHeight: boolean;
  run: (action: () => Promise<BuilderState>, success?: string) => Promise<boolean>;
}

const small = "h-9 md:text-sm";

function useRun(): Ctx["run"] {
  const router = useRouter();
  const { toast } = useToast();
  return async (action, success) => {
    const result = await action();
    if (!result.ok) {
      toast({ tone: "danger", message: result.message ?? "Não foi possível guardar" });
      return false;
    }
    if (success) toast({ tone: "ok", message: success });
    router.refresh();
    return true;
  };
}

/** Texto que guarda ao sair do campo (ou com Enter) se mudou. */
function BlurInput({
  value,
  onCommit,
  className,
  disabled,
  ...rest
}: Omit<React.ComponentProps<"input">, "value" | "onChange"> & {
  value: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setDraft(value);
  }
  return (
    <input
      {...rest}
      value={draft}
      disabled={disabled}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => draft.trim() !== value.trim() && onCommit(draft)}
      onKeyDown={(event) => {
        if (event.key === "Enter") (event.target as HTMLInputElement).blur();
        if (event.key === "Escape") setDraft(value);
      }}
      className={cn(fieldClass, className)}
    />
  );
}

// ── Custo (artigo, como conta, margem) ──────────────────────────────────────

function costPayload(cost: BuilderCost | null): CostPayload {
  return {
    source: cost?.source ?? "material",
    itemId: cost?.itemId ?? "",
    basis: cost?.spec.basis ?? "one",
    factor: cost ? cost.spec.factor.replace(".", ",") : "1",
    fixed: cost && Number(cost.spec.fixed) !== 0 ? cost.spec.fixed.replace(".", ",") : "",
    margin: cost?.margin ? fractionToPercent(cost.margin) : "",
  };
}

function CostFields({
  ctx,
  cost,
  onSave,
  label,
}: {
  ctx: Ctx;
  cost: BuilderCost | null;
  onSave: (payload: CostPayload) => Promise<boolean>;
  /** Para leitores de ecrã: «Preto», «Base: Chapa». */
  label: string;
}) {
  const id = useId();
  const [payload, setPayload] = useState<CostPayload>(() => costPayload(cost));
  const [pending, startTransition] = useTransition();
  const disabled = !ctx.versionId || pending;
  const save = (next: CostPayload) => {
    setPayload(next);
    if (!next.itemId) return;
    startTransition(async () => {
      await onSave(next);
    });
  };
  const options = [
    ...ctx.sources.articles.map((article) => ({
      value: `material:${article.id}`,
      label: article.name,
      hint: `${article.code} · ${costToInput(article.cost)} €/${article.unit}${article.family ? ` · ${article.family}` : ""}`,
    })),
    ...ctx.sources.sectors.map((sector) => ({
      value: `sector:${sector.id}`,
      label: `Mão de obra: ${sector.name}`,
      hint: `${centsToEuroInput(sector.rateCents)} €/h`,
    })),
  ];
  const unit =
    payload.source === "sector"
      ? "h"
      : (ctx.sources.articles.find((a) => a.id === payload.itemId)?.unit ?? "");
  const unavailable = (basis: Basis) =>
    BASIS_NEEDS[basis].some((v) => (v === "L" ? !ctx.hasWidth : !ctx.hasHeight));
  const marginMissing = Boolean(payload.itemId) && payload.margin.trim() === "";

  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1.75fr)_6rem] sm:items-start">
      <div className="min-w-0">
        <span className="text-steel mb-1 block text-xs sm:hidden">Artigo</span>
        <SearchSelect
          key={`${payload.source}:${payload.itemId}`}
          name={`${id}-item`}
          ariaLabel={`Artigo ou mão de obra de ${label}`}
          placeholder="Escolher artigo do Odoo ou mão de obra…"
          emptyText="Nada com esse nome."
          defaultValue={payload.itemId ? `${payload.source}:${payload.itemId}` : ""}
          options={options}
          onValueChange={(value) => {
            const [source, itemId] = value.split(":") as ["material" | "sector", string];
            save({ ...payload, source, itemId });
          }}
          className={cn(disabled && "pointer-events-none opacity-60")}
        />
      </div>
      <div
        className={cn(
          "grid min-w-0 gap-2",
          payload.basis === "one"
            ? "grid-cols-[4.5rem_minmax(0,1fr)]"
            : "grid-cols-[4.5rem_minmax(0,1fr)_4.5rem]",
        )}
      >
        <span className="text-steel col-span-full -mb-1 block text-xs sm:hidden">Quantidade</span>
        <label className="relative">
          <span className="sr-only">Quantos, para {label}</span>
          <BlurInput
            value={payload.factor}
            inputMode="decimal"
            disabled={disabled}
            className={cn(small, "w-full pr-6 text-right tabular-nums")}
            onCommit={(factor) => save({ ...payload, factor })}
          />
          <span
            aria-hidden
            className="text-steel pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs"
          >
            ×
          </span>
        </label>
        <label>
          <span className="sr-only">Como conta, para {label}</span>
          <select
            value={payload.basis}
            disabled={disabled}
            onChange={(event) => save({ ...payload, basis: event.target.value })}
            className={cn(fieldClass, small, "w-full")}
          >
            {BASES.map((basis) => (
              <option key={basis} value={basis} disabled={unavailable(basis)}>
                {BASIS_LABEL[basis]}
                {unavailable(basis) ? " — marque largura e altura" : ""}
              </option>
            ))}
          </select>
        </label>
        {payload.basis !== "one" && (
          <label className="relative" title="Quantidade fixa somada (ex.: 2 m de sobra)">
            <span className="sr-only">Mais uma quantidade fixa, para {label}</span>
            <span
              aria-hidden
              className="text-steel pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs"
            >
              +
            </span>
            <BlurInput
              value={payload.fixed}
              inputMode="decimal"
              placeholder="0"
              disabled={disabled}
              className={cn(small, "w-full pl-5 text-right tabular-nums")}
              onCommit={(fixed) => save({ ...payload, fixed })}
            />
          </label>
        )}
      </div>
      <label className="relative">
        <span className="text-steel mb-1 block text-xs sm:hidden">Margem</span>
        <span className="sr-only">Margem de {label}, em percentagem</span>
        <BlurInput
          value={payload.margin}
          inputMode="decimal"
          placeholder="margem"
          aria-invalid={marginMissing || undefined}
          disabled={disabled}
          className={cn(
            small,
            "w-full pr-7 text-right tabular-nums",
            marginMissing && "border-warn-line bg-warn-bg",
          )}
          onCommit={(margin) => save({ ...payload, margin })}
        />
        <span
          aria-hidden
          className="text-steel pointer-events-none absolute right-2 bottom-2.5 text-xs"
        >
          %
        </span>
      </label>
      {payload.itemId && (
        <p className="text-steel text-xs sm:col-span-3">
          {describeQuantity(
            {
              basis: payload.basis as Basis,
              factor: payload.factor.replace(",", ".") || "1",
              fixed: payload.fixed.replace(",", ".") || "0",
            },
            unit,
          )}
          {marginMissing && (
            <span className="text-warn"> · falta a margem: sem ela o produto não se publica</span>
          )}
          {pending && " · a guardar…"}
        </p>
      )}
    </div>
  );
}

// ── Base do produto ─────────────────────────────────────────────────────────

function BaseSection({ ctx, base }: { ctx: Ctx; base: BuilderData["base"] }) {
  const [adding, setAdding] = useState(base.length === 0);
  const [newLabel, setNewLabel] = useState("");
  return (
    <div className="grid gap-3">
      {base.length === 0 && !ctx.versionId && <p className="text-steel text-sm">Nada na base.</p>}
      {base.length > 0 && (
        <ul className="border-line bg-surface divide-line-soft divide-y rounded-[2px] border">
          {base.map((line) => (
            <li
              key={line.lineId}
              id={`linha-${line.lineId}`}
              className="grid scroll-mt-32 gap-2 px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <BlurInput
                  value={line.label}
                  aria-label="Nome desta linha da base"
                  disabled={!ctx.versionId}
                  className={cn(small, "text-ink font-medium md:w-72")}
                  onCommit={(label) =>
                    void ctx.run(() =>
                      saveBaseLineAction(
                        ctx.productId,
                        ctx.versionId!,
                        line.lineId,
                        label,
                        costPayload(line),
                      ),
                    )
                  }
                />
                {ctx.versionId && (
                  <ConfirmButton
                    label={<Trash2 aria-hidden className="size-4" />}
                    question={`Tirar «${line.label}» da base?`}
                    confirmLabel="Tirar"
                    type="button"
                    onConfirm={() =>
                      void ctx.run(() =>
                        removeBaseLineAction(ctx.productId, ctx.versionId!, line.lineId),
                      )
                    }
                    className="ml-auto"
                  />
                )}
              </div>
              <CostFields
                ctx={ctx}
                cost={line}
                label={`Base: ${line.label}`}
                onSave={(payload) =>
                  ctx.run(() =>
                    saveBaseLineAction(
                      ctx.productId,
                      ctx.versionId!,
                      line.lineId,
                      line.label,
                      payload,
                    ),
                  )
                }
              />
            </li>
          ))}
        </ul>
      )}
      {ctx.versionId &&
        (adding ? (
          <div className="border-line-strong bg-surface grid gap-2 rounded-[2px] border border-dashed px-4 py-3">
            <input
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              placeholder="Nome (ex.: Quadro, Chapa, Serralharia)"
              aria-label="Nome da nova linha da base"
              className={cn(fieldClass, small, "md:w-72")}
            />
            <CostFields
              ctx={ctx}
              cost={null}
              label="nova linha da base"
              onSave={async (payload) => {
                const ok = await ctx.run(() =>
                  saveBaseLineAction(ctx.productId, ctx.versionId!, null, newLabel, payload),
                );
                if (ok) {
                  setNewLabel("");
                  setAdding(false);
                }
                return ok;
              }}
            />
            <p className="text-steel text-xs">
              Escolha o artigo para criar a linha; depois a margem.
            </p>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-self-start"
            onClick={() => setAdding(true)}
          >
            <Plus aria-hidden className="size-4" /> Acrescentar à base
          </Button>
        ))}
    </div>
  );
}

// ── Divisões ────────────────────────────────────────────────────────────────

function ValueRow({
  ctx,
  division,
  value,
}: {
  ctx: Ctx;
  division: BuilderDivision;
  value: BuilderValue;
}) {
  const [withCost, setWithCost] = useState(Boolean(value.cost));
  const editable = Boolean(ctx.versionId);
  return (
    <li
      id={value.cost ? `linha-${value.cost.lineId}` : undefined}
      className="grid scroll-mt-32 gap-2 px-4 py-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2" title="Vem escolhido na loja">
          <input
            type="radio"
            name={`omissao-${division.productOptionId}`}
            checked={value.isDefault}
            disabled={!editable}
            onChange={() =>
              void ctx.run(() =>
                setDefaultValueAction(
                  ctx.productId,
                  ctx.versionId!,
                  division.productOptionId,
                  value.id,
                ),
              )
            }
            className="size-4"
          />
          <span className="sr-only">Vem escolhido: {value.name}</span>
        </label>
        <BlurInput
          value={value.name}
          aria-label={`Nome da opção ${value.name}`}
          disabled={!editable || !division.owned}
          className={cn(small, "min-w-40 flex-1 font-medium sm:max-w-72")}
          onCommit={(name) =>
            void ctx.run(() => renameValueAction(ctx.productId, ctx.versionId!, value.id, name))
          }
        />
        {value.isDefault && <StatusBadge tone="quiet">vem escolhido</StatusBadge>}
        {!withCost && division.owned && (
          <span className="text-steel text-[13px]">
            Sem custo
            {editable && (
              <>
                {" · "}
                <button type="button" className="link-admin" onClick={() => setWithCost(true)}>
                  acrescentar custo
                </button>
              </>
            )}
          </span>
        )}
        {editable && (
          <span className="ml-auto flex items-center gap-1">
            {withCost && value.cost && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  if (
                    await ctx.run(() =>
                      setValueCostAction(
                        ctx.productId,
                        ctx.versionId!,
                        division.productOptionId,
                        value.id,
                        null,
                      ),
                    )
                  )
                    setWithCost(false);
                }}
              >
                Tirar custo
              </Button>
            )}
            <ConfirmButton
              label={<Trash2 aria-hidden className="size-4" />}
              question={`Tirar «${value.name}» de ${division.name}?`}
              confirmLabel="Tirar"
              type="button"
              onConfirm={() =>
                void ctx.run(() =>
                  removeValueAction(
                    ctx.productId,
                    ctx.versionId!,
                    division.productOptionId,
                    value.id,
                  ),
                )
              }
            />
          </span>
        )}
      </div>
      {withCost && (
        <CostFields
          ctx={ctx}
          cost={value.cost}
          label={value.name}
          onSave={(payload) =>
            ctx.run(() =>
              setValueCostAction(
                ctx.productId,
                ctx.versionId!,
                division.productOptionId,
                value.id,
                payload,
              ),
            )
          }
        />
      )}
    </li>
  );
}

const ROLE_LABEL: Record<Role, string> = {
  width: "Largura",
  height: "Altura",
  other: "Outra medida",
};

function DivisionCard({ ctx, division }: { ctx: Ctx; division: BuilderDivision }) {
  const editable = Boolean(ctx.versionId);
  const [newValue, setNewValue] = useState("");
  const update = (patch: Parameters<typeof updateDivisionAction>[3]) =>
    void ctx.run(() =>
      updateDivisionAction(ctx.productId, ctx.versionId!, division.productOptionId, patch),
    );
  const missingMargins = division.values.filter((v) => v.cost && v.cost.margin === null).length;

  return (
    <article className="border-line bg-surface rounded-[2px] border">
      <header className="border-line-soft flex flex-wrap items-center gap-3 border-b px-4 py-3">
        {division.type === "dimension" && (
          <Ruler aria-hidden className="text-steel size-4" strokeWidth={1.75} />
        )}
        <BlurInput
          value={division.name}
          aria-label="Nome da divisão (o que o cliente lê)"
          disabled={!editable || !division.owned}
          className="text-ink h-10 min-w-48 flex-1 border-transparent bg-transparent text-lg font-semibold hover:border-line-strong focus-visible:bg-white sm:max-w-96"
          onCommit={(name) => update({ name })}
        />
        <span className="text-steel text-[13px]">
          {division.type === "dimension"
            ? "Medida em mm"
            : division.type === "choice"
              ? "Escolha"
              : "Sim/não"}
          {!division.owned && " · da biblioteca"}
        </span>
        {missingMargins > 0 && (
          <StatusBadge tone="warn">
            {missingMargins === 1
              ? "1 margem por escrever"
              : `${missingMargins} margens por escrever`}
          </StatusBadge>
        )}
        {editable && (
          <ConfirmButton
            label={<Trash2 aria-hidden className="size-4" />}
            question={`Tirar a divisão «${division.name}» deste produto?`}
            consequence="Sai do produto com as opções e os custos que tem aqui."
            confirmLabel="Tirar divisão"
            type="button"
            onConfirm={() =>
              void ctx.run(() =>
                removeDivisionAction(ctx.productId, ctx.versionId!, division.productOptionId),
              )
            }
            className="ml-auto"
          />
        )}
      </header>

      {division.type === "dimension" && (
        <div className="grid gap-4 px-4 py-4 sm:grid-cols-[repeat(3,minmax(0,8rem))_minmax(0,1fr)]">
          {(["min", "max", "step"] as const).map((field) => (
            <label key={field} className="grid gap-1 text-[13px]">
              <span className="text-steel">
                {field === "min" ? "Mínimo" : field === "max" ? "Máximo" : "De quanto em quanto"}
              </span>
              <span className="relative">
                <BlurInput
                  value={division[field] === null ? "" : String(division[field])}
                  inputMode="numeric"
                  disabled={!editable}
                  className={cn(small, "w-full pr-10 text-right tabular-nums")}
                  onCommit={(value) => update({ [field]: value })}
                />
                <span
                  aria-hidden
                  className="text-steel pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs"
                >
                  mm
                </span>
              </span>
            </label>
          ))}
          <fieldset className="grid gap-1 text-[13px]">
            <legend className="text-steel mb-1">É a…</legend>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(ROLE_LABEL) as Role[]).map((role) => (
                <label
                  key={role}
                  className={cn(
                    "border-line-strong has-[:checked]:bg-ink has-[:checked]:border-ink inline-flex h-9 cursor-pointer items-center rounded-full border px-3 has-[:checked]:text-white",
                    !editable && "pointer-events-none opacity-60",
                  )}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name={`papel-${division.productOptionId}`}
                    checked={division.role === role}
                    onChange={() => update({ role })}
                  />
                  {ROLE_LABEL[role]}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {division.type === "choice" && (
        <>
          <div className="text-steel hidden grid-cols-[minmax(0,1.25fr)_minmax(0,1.75fr)_6rem] gap-2 px-4 pt-3 text-xs sm:grid">
            <span>Opção · artigo</span>
            <span>Quantidade · como conta</span>
            <span>Margem</span>
          </div>
          <ul className="divide-line-soft divide-y">
            {division.values.map((value) => (
              <ValueRow key={value.id} ctx={ctx} division={division} value={value} />
            ))}
          </ul>
          {editable && division.owned && (
            <form
              className="border-line-soft flex flex-wrap gap-2 border-t px-4 py-3"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!newValue.trim()) return;
                if (
                  await ctx.run(() =>
                    addValueAction(
                      ctx.productId,
                      ctx.versionId!,
                      division.productOptionId,
                      newValue,
                    ),
                  )
                )
                  setNewValue("");
              }}
            >
              <input
                value={newValue}
                onChange={(event) => setNewValue(event.target.value)}
                placeholder={
                  division.values.length ? "Nova opção" : "Primeira opção (ex.: Sem motor)"
                }
                aria-label={`Nova opção em ${division.name}`}
                className={cn(fieldClass, small, "min-w-48 flex-1 sm:max-w-80")}
              />
              <Button type="submit" variant="outline" size="sm">
                <Plus aria-hidden className="size-4" /> Acrescentar opção
              </Button>
            </form>
          )}
        </>
      )}
    </article>
  );
}

function AddDivision({
  ctx,
  copyable,
}: {
  ctx: Ctx;
  copyable: { productOptionId: string; label: string }[];
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"choice" | "dimension">("choice");
  const [role, setRole] = useState<Role>("other");
  const [from, setFrom] = useState("");
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <form
        className="border-line-strong bg-surface grid gap-3 rounded-[2px] border border-dashed px-4 py-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!name.trim()) return;
          if (
            await ctx.run(() => addDivisionAction(ctx.productId, ctx.versionId!, name, type, role))
          ) {
            setName("");
            setRole("other");
          }
        }}
      >
        <p className="text-ink font-semibold">Nova divisão</p>
        <input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            const plain = event.target.value.toLowerCase();
            if (type === "dimension")
              setRole(
                plain.startsWith("larg") ? "width" : plain.startsWith("alt") ? "height" : role,
              );
          }}
          placeholder="Nome que o cliente lê (ex.: Motorização, Cor, Altura)"
          aria-label="Nome da nova divisão"
          className={cn(fieldClass, "w-full")}
        />
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {(
            [
              ["choice", "Escolha (o cliente escolhe uma opção)"],
              ["dimension", "Medida (o cliente escreve em mm)"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="border-line-strong has-[:checked]:bg-ink has-[:checked]:border-ink inline-flex h-9 cursor-pointer items-center rounded-full border px-3 has-[:checked]:text-white"
            >
              <input
                type="radio"
                className="sr-only"
                name="tipo-divisao"
                checked={type === value}
                onChange={() => setType(value)}
              />
              {label}
            </label>
          ))}
        </div>
        {type === "dimension" && (
          <label className="grid gap-1 text-[13px]">
            <span className="text-steel">É a…</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
              className={cn(fieldClass, small, "w-48")}
            >
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
        )}
        <Button type="submit" className="justify-self-start">
          <Plus aria-hidden className="size-4" /> Acrescentar divisão
        </Button>
      </form>
      <form
        className="border-line bg-surface grid content-start gap-3 rounded-[2px] border px-4 py-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!from) return;
          if (
            await ctx.run(
              () => copyDivisionAction(ctx.productId, ctx.versionId!, from),
              "Divisão copiada.",
            )
          )
            setFrom("");
        }}
      >
        <p className="text-ink font-semibold">Copiar de outro produto</p>
        <p className="text-steel text-[13px]">
          Traz a divisão com as opções, os artigos e as margens; depois muda-se à vontade, só neste
          produto.
        </p>
        <select
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          aria-label="Divisão a copiar"
          className={cn(fieldClass, "w-full")}
        >
          <option value="">
            {copyable.length ? "Escolher divisão…" : "Ainda não há outros produtos"}
          </option>
          {copyable.map((item) => (
            <option key={item.productOptionId} value={item.productOptionId}>
              {item.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" disabled={!from} className="justify-self-start">
          <Copy aria-hidden className="size-4" /> Copiar
        </Button>
      </form>
    </div>
  );
}

export function ProductBuilder({
  productId,
  versionId,
  data,
  sources,
  copyable,
}: {
  productId: string;
  /** Versão em preparação; null = só leitura. */
  versionId: string | null;
  data: BuilderData;
  sources: BuilderSources;
  copyable: { productOptionId: string; label: string }[];
}) {
  const run = useRun();
  const ctx: Ctx = {
    productId,
    versionId,
    sources,
    hasWidth: data.hasWidth,
    hasHeight: data.hasHeight,
    run,
  };
  return (
    <>
      <section id="preco" aria-labelledby="base-titulo" className="scroll-mt-28 grid gap-3">
        <div>
          <h2 id="base-titulo" className="text-ink text-lg/[26px] font-semibold">
            Base do produto{" "}
            <span className="text-steel text-sm font-normal">· o cliente não vê</span>
          </h2>
          <p className="text-steel mt-1 max-w-[68ch] text-sm">
            O que o produto leva sempre, seja qual for a escolha do cliente (tubo, chapa, horas de
            serralharia). Cada linha: o artigo, quanto leva e a margem.
          </p>
        </div>
        <BaseSection ctx={ctx} base={data.base} />
      </section>

      <section id="opcoes" aria-labelledby="divisoes-titulo" className="scroll-mt-28 grid gap-3">
        <div>
          <h2 id="divisoes-titulo" className="text-ink text-lg/[26px] font-semibold">
            Divisões{" "}
            <span className="text-steel text-sm font-normal tabular-nums">
              {data.divisions.length}
            </span>
          </h2>
          <p className="text-steel mt-1 max-w-[68ch] text-sm">
            O que o cliente vê e escolhe, pela ordem da loja. Em cada opção com custo: o artigo,
            quanto leva e a margem. A opção marcada é a que vem escolhida.
          </p>
        </div>
        {(!data.hasWidth || !data.hasHeight) &&
          data.divisions.some((d) => d.type === "dimension") && (
            <p className="text-warn flex gap-1.5 text-[13px]">
              <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              Marque numa medida «Largura» e noutra «Altura» para poder contar por m², por metro ou
              por perímetro.
            </p>
          )}
        <div className="grid gap-4">
          {data.divisions.map((division) => (
            <DivisionCard key={division.productOptionId} ctx={ctx} division={division} />
          ))}
        </div>
        {versionId && <AddDivision ctx={ctx} copyable={copyable} />}
      </section>
    </>
  );
}
