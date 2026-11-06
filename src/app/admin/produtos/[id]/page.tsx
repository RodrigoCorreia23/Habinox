import { listVersionCostItems } from "@/server/catalog/cost-overrides";
import { CostTable } from "./cost-table";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ArrowUpRight, ImageOff } from "lucide-react";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { describeRule } from "@/components/admin/describe-rule";
import { EmptyState } from "@/components/admin/empty-state";
import { Money } from "@/components/admin/format";
import { Help } from "@/components/admin/help";
import { ImageField } from "@/components/admin/image-field";
import { Notice } from "@/components/admin/notice";
import { PageBody } from "@/components/admin/page-body";
import { PageHeader } from "@/components/admin/page-header";
import { PriceTicket } from "@/components/admin/price-ticket";
import { ReorderButtons } from "@/components/admin/reorder-buttons";
import { RuleForm } from "@/components/admin/rule-form";
import { Panel, Section } from "@/components/admin/section";
import { StatusBadge, VersionStatusBadge } from "@/components/admin/status-badge";
import type { VersionStatus } from "@/components/admin/status";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format-date";
import { objectPosition } from "@/lib/images";
import { formatEuros } from "@/lib/money";
import type { Rule } from "@/lib/options";
import { fractionToPercent } from "@/lib/percent";
import { validateFormula } from "@/lib/pricing";
import { requireAdmin } from "@/server/auth/session";
import {
  listFormulaSources,
  listLines,
  listVariables,
  loadPricingModel,
} from "@/server/catalog/formula";
import { listOptions, OPTION_TYPES } from "@/server/catalog/options";
import { getProduct, listLeafCategories, listVersionOptions } from "@/server/catalog/products";
import { checkVersion, listRules } from "@/server/catalog/rules";
import { getVatRate } from "@/server/settings";
import { removeRuleAction } from "../../rule-actions";
import {
  confirmAndPublishAction,
  createDraftAction,
  moveOptionAction,
  removeOptionAction,
} from "../actions";
import { moveFormulaItemAction, removeFormulaItemAction } from "../formula-actions";
import {
  ConsumablesForm,
  type FormulaContext,
  LineForm,
  type LineValues,
  type OptionInfo,
} from "../formula-forms";
import { AddOptionForm, ProductForm, ProductOptionForm } from "../forms";
import { articleHint, sectorHint } from "../hints";
import { VariableForm } from "../formula-forms";
import { computePreview, lineExamples, sampleInput, sampleScope } from "../preview";
import {
  conditionsText,
  locateProblems,
  type Problem,
  ruleIssuesAt,
  stepStatus,
} from "./editor-data";
import type { ScopeName } from "./expression-input";
import {
  AddRow,
  InlineEditGroup,
  InlineEditRow,
  OpenRowButton,
  StaticRow,
} from "./inline-edit-row";
import { SamplePrice } from "./sample-price";
import { SectionNav } from "./section-nav";

export const metadata: Metadata = { title: "Produto · Habinox" };

const numberFormat = new Intl.NumberFormat("pt-PT", {
  useGrouping: "always",
  maximumFractionDigits: 3,
});

function mm(value: number) {
  return `${numberFormat.format(value)} mm`;
}

function limits(min: number | null, max: number | null, unit: string) {
  const format = (value: number) => (unit === "mm" ? mm(value) : numberFormat.format(value));
  if (min === null && max === null) return "sem limites";
  if (min !== null && max !== null) return `${format(min)} a ${format(max)}`;
  return min !== null ? `a partir de ${format(min)}` : `até ${format(max!)}`;
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/** Lista de linhas com o aspeto de painel (sem painel dentro de painel). */
function RowList({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <ul
      aria-label={label}
      className="bg-surface border-line divide-line-soft divide-y rounded-[2px] border"
    >
      {children}
    </ul>
  );
}

/** Zona de perigo dentro de uma linha aberta: à esquerda, longe de Guardar e das setas. */
function DangerZone({ children }: { children: React.ReactNode }) {
  return (
    <div data-danger className="border-line-soft mt-5 border-t pt-4">
      {children}
    </div>
  );
}

export default async function ProductPage({ params }: PageProps<"/admin/produtos/[id]">) {
  await requireAdmin("/admin/produtos");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const data = await getProduct(id);
  if (!data) notFound();
  const { product, working, published } = data;
  const shown = working ?? published;
  const editable = working !== null;

  const [
    categories,
    versionOptions,
    library,
    variables,
    lines,
    sources,
    model,
    vatRate,
    libraryRuleRows,
  ] = await Promise.all([
    listLeafCategories(),
    shown ? listVersionOptions(shown.id) : Promise.resolve([]),
    listOptions(),
    shown ? listVariables(shown.id) : Promise.resolve([]),
    shown ? listLines(shown.id) : Promise.resolve([]),
    listFormulaSources(),
    shown ? loadPricingModel(shown.id) : Promise.resolve(null),
    getVatRate(),
    listRules(null),
  ]);
  const [rules, problems, publishedModel, costItems] = await Promise.all([
    shown ? listRules(shown.id) : Promise.resolve([]),
    working ? checkVersion(working.id) : Promise.resolve(null),
    working && published ? loadPricingModel(published.id) : Promise.resolve(null),
    shown ? listVersionCostItems(shown.id) : Promise.resolve([]),
  ]);

  const category = categories.find((candidate) => candidate.id === product.categoryId);
  const shopHref = published && category ? `/pt/loja/${category.slug}/${product.slug}` : null;

  // ── Opções, regras e o exemplo ──────────────────────────────────────────
  const optionInfo: OptionInfo[] = (model?.meta ?? []).map((option) => ({
    key: option.key,
    name: option.name,
    type: option.type,
    unit: option.unit,
    values: option.values,
  }));
  const ruleValues = rules.map((rule) => ({
    conditions: rule.conditions,
    effect: rule.effect,
    message: rule.message?.pt ?? "",
  }));
  const toRule = (row: (typeof rules)[number]): Rule => ({
    conditions: row.conditions,
    effect: row.effect,
  });
  const ruleIssuesByIndex = model
    ? ruleIssuesAt(model, rules.map(toRule), optionInfo)
    : new Map<number, string[]>();
  const usedKeys = new Set(optionInfo.map((option) => option.key));
  const libraryRules = libraryRuleRows.filter((row) => {
    const keys = [
      ...row.conditions.flatMap((condition) =>
        "value" in condition && typeof condition.value === "object"
          ? [condition.option, condition.value.option]
          : [condition.option],
      ),
      ...("option" in row.effect ? [row.effect.option] : []),
    ];
    return keys.length > 0 && keys.every((key) => usedKeys.has(key));
  });

  const input = model ? sampleInput(model) : {};
  const preview = model && optionInfo.length > 0 ? computePreview(model, input, vatRate) : null;
  const examples = model ? lineExamples(model, input) : [];
  const scope = model ? sampleScope(model, input) : {};
  const sampleText = optionInfo
    .map((option) => {
      const value = input[option.key];
      if (option.type === "dimension") return `${option.name} ${mm(Number(value))}`;
      if (option.type === "choice")
        return option.values.find((candidate) => candidate.key === value)?.label;
      if (option.type === "boolean") return value === true ? option.name : null;
      return `${option.name} ${value}`;
    })
    .filter(Boolean)
    .join(" · ");

  // Nomes que as contas podem usar (fichas do ExpressionInput).
  const scopeNames: ScopeName[] = [];
  for (const option of model?.input.options ?? []) {
    const meta = model!.meta.find((entry) => entry.key === option.key);
    const name = option.var ?? option.key;
    const label = meta?.name ?? option.key;
    if (option.type === "dimension")
      scopeNames.push({ name, label, kind: "measure", sampleMm: Number(input[option.key]) });
    else if (option.type === "number") scopeNames.push({ name, label, kind: "number" });
    else if (option.type === "boolean") scopeNames.push({ name, label, kind: "yesno" });
    else {
      const params = new Set(option.values?.flatMap((value) => Object.keys(value.params ?? {})));
      for (const param of params) {
        scopeNames.push({ name: `${name}.${param}`, label: `${label}: ${param}`, kind: "param" });
      }
    }
  }
  for (const variable of variables) {
    scopeNames.push({
      name: variable.name,
      label: variable.label?.pt || variable.name,
      kind: "variable",
    });
  }
  const formulaContext: FormulaContext = {
    names: scopeNames,
    options: model?.input.options ? [...model.input.options] : [],
    variables: variables.map((variable) => ({ name: variable.name, expr: variable.expr })),
    scope,
  };

  const issues = model
    ? validateFormula({
        options: model.input.options,
        variables: formulaContext.variables,
        lines: lines.map(({ line }) => ({ quantityExpr: line.quantityExpr })),
      })
    : [];
  const issuesFor = (kind: "variable" | "line", index: number) =>
    issues
      .filter((issue) => issue.where.kind === kind && issue.where.index === index)
      .map((issue) => issue.message);

  const choiceOptions = versionOptions
    .filter((row) => row.option.type === "choice")
    .map((row) => ({
      id: row.option.id,
      key: row.option.key,
      name: row.option.name.pt,
      values: row.libraryValues
        .filter((value) => row.allowed.some((allowed) => allowed.optionValueId === value.id))
        .map((value) => ({
          id: value.id,
          key: value.key,
          label: value.label.pt,
          materialId: value.materialId,
        })),
    }));
  const lineValues = (row: (typeof lines)[number]): LineValues => ({
    label: row.line.label,
    kind: row.line.kind as LineValues["kind"],
    quantityExpr: row.line.quantityExpr,
    unit: row.line.unit,
    conditions: row.line.conditions,
    source: row.line.articleOptionId ? "byOption" : "fixed",
    sectorId: row.line.sectorId ?? "",
    materialId: row.line.materialId ?? "",
    articleOptionId: row.line.articleOptionId ?? "",
    mapping: row.mapping.map((mapping) => ({
      optionValueId: mapping.optionValueId,
      materialId: mapping.materialId,
    })),
  });
  const used = new Set(versionOptions.map((row) => row.option.id));
  const available = library
    .filter((option) => !used.has(option.id))
    .map((option) => ({
      id: option.id,
      label: option.name.pt,
      hint: OPTION_TYPES[option.type as keyof typeof OPTION_TYPES],
    }));

  // ── Problemas e passos ─────────────────────────────────────────────────
  const located: Problem[] =
    working && model
      ? locateProblems({
          model,
          options: optionInfo,
          versionOptions: versionOptions.map((row) => ({
            id: row.productOption.id,
            name: row.option.name.pt,
            type: row.option.type,
            allowedCount: row.allowed.length,
          })),
          variables: variables.map((variable) => ({
            id: variable.id,
            label: variable.label?.pt || variable.name,
          })),
          lines: lines.map(({ line }) => ({ id: line.id, label: line.label })),
          rules: rules.map((rule) => ({ id: rule.id, rule: toRule(rule) })),
          libraryRules: libraryRuleRows.map(toRule),
        })
      : [];
  const blockingCount = problems?.blocking.length ?? 0;
  const problemsIn = (section: Problem["section"]) =>
    located.filter((problem) => problem.section === section).length;
  const warnings = [
    ...versionOptions
      .filter(
        (row) =>
          row.option.type === "dimension" &&
          (row.productOption.min === null || row.productOption.max === null),
      )
      .map(
        (row) =>
          `«${row.option.name.pt}» não tem mínimo e máximo: o cliente pode pedir qualquer tamanho.`,
      ),
    ...(problems?.warnings.filter(
      (warning) =>
        warning.startsWith("Desapareceram") || warning.startsWith("Os valores que vêm escolhidos"),
    ) ?? []),
  ];
  const firstProblemHref = located[0]?.href ?? "#publicar";

  const optionCount = versionOptions.length;
  const steps = [
    {
      id: "montra",
      title: "Montra",
      status: stepStatus(0, Boolean(product.imageUrl), false),
      detail: product.imageUrl ? undefined : "sem imagem",
    },
    {
      id: "opcoes",
      title: "Opções",
      status: stepStatus(problemsIn("opcoes"), optionCount > 0, editable),
      detail: problemsIn("opcoes") > 0 ? `${problemsIn("opcoes")}` : `${optionCount}`,
    },
    {
      id: "regras",
      title: "Regras",
      status: stepStatus(problemsIn("regras"), optionCount > 0, false),
      detail: problemsIn("regras") > 0 ? `${problemsIn("regras")}` : `${rules.length}`,
    },
    {
      id: "preco",
      title: "Preço",
      status: stepStatus(problemsIn("preco"), lines.length > 0, editable && optionCount > 0),
      detail:
        problemsIn("preco") > 0
          ? `${problemsIn("preco")}`
          : plural(lines.length, "linha", "linhas"),
    },
    {
      id: "publicar",
      title: "Publicar",
      status: !working
        ? ("done" as const)
        : blockingCount === 0
          ? ("current" as const)
          : ("todo" as const),
      detail: !working ? "na loja" : undefined,
    },
  ];

  // ── Publicar: antes → depois ───────────────────────────────────────────
  const before = publishedModel ? computePreview(publishedModel, input, vatRate) : null;
  const differences: string[] = [];
  if (working && publishedModel && model) {
    const beforeKeys = new Set(publishedModel.meta.map((option) => option.key));
    const afterKeys = new Set(model.meta.map((option) => option.key));
    const added = model.meta.filter((option) => !beforeKeys.has(option.key));
    const removed = publishedModel.meta.filter((option) => !afterKeys.has(option.key));
    if (added.length > 0)
      differences.push(
        `+${plural(added.length, "opção", "opções")}: ${added.map((option) => option.name).join(", ")}`,
      );
    if (removed.length > 0)
      differences.push(
        `−${plural(removed.length, "opção", "opções")}: ${removed.map((option) => option.name).join(", ")}`,
      );
    if (publishedModel.input.lines.length !== model.input.lines.length)
      differences.push(
        `Linhas de custo: ${publishedModel.input.lines.length} → ${model.input.lines.length}`,
      );
    const beforeRules = publishedModel.rules.length;
    const afterRules = model.rules.length;
    if (beforeRules !== afterRules) differences.push(`Regras: ${beforeRules} → ${afterRules}`);
  }

  const publishDialog = (variant: "default" | "outline") =>
    working ? (
      <ConfirmDialog
        tone="default"
        title={`Publicar «${product.name.pt}» na loja?`}
        confirmLabel="Publicar na loja"
        formAction={confirmAndPublishAction.bind(null, product.id, working.id)}
        trigger={<Button variant={variant}>Publicar na loja</Button>}
      >
        <p>
          Os clientes passam a ver a versão {working.version}. Os orçamentos e as encomendas já
          feitos não mudam.
        </p>
        {preview?.ok && (
          <PriceTicket
            title={`Depois de publicar, no exemplo (${sampleText})`}
            rows={[]}
            totals={{
              netCents: preview.netCents,
              vatRate: preview.vatRate,
              totalCents: preview.totalCents,
            }}
            note={
              before?.ok ? (
                <>
                  Agora na loja:{" "}
                  <span className="tabular-nums">{formatEuros(before.totalCents)}</span>
                  {before.totalCents !== preview.totalCents && (
                    <span className="tabular-nums">
                      {" "}
                      ({preview.totalCents > before.totalCents ? "+" : "−"}
                      {formatEuros(Math.abs(preview.totalCents - before.totalCents))})
                    </span>
                  )}
                </>
              ) : published ? (
                "Na versão da loja, este exemplo não se calcula."
              ) : (
                "Ainda não está na loja."
              )
            }
          />
        )}
        {published && (
          <div className="text-ink-soft text-sm">
            {differences.length > 0 ? (
              <ul className="grid list-disc gap-0.5 pl-5">
                {differences.map((difference) => (
                  <li key={difference}>{difference}</li>
                ))}
              </ul>
            ) : (
              <p>Sem diferenças nas opções, nas linhas de custo e nas regras.</p>
            )}
          </div>
        )}
      </ConfirmDialog>
    ) : null;

  const primaryAction = !working ? (
    published ? (
      <form action={createDraftAction.bind(null, product.id, published.id)}>
        <Button type="submit" className="w-full">
          Fazer alterações
        </Button>
      </form>
    ) : null
  ) : blockingCount > 0 ? (
    <Button asChild variant="outline">
      <a href={firstProblemHref}>
        {plural(blockingCount, "coisa por resolver", "coisas por resolver")}
      </a>
    </Button>
  ) : (
    publishDialog("default")
  );

  // ── Resumos ────────────────────────────────────────────────────────────
  const optionSummary = (row: (typeof versionOptions)[number]) => {
    const { productOption, option, allowed, libraryValues } = row;
    const letter = productOption.var ?? option.key;
    const allowedNames = libraryValues
      .filter((value) => allowed.some((entry) => entry.optionValueId === value.id))
      .map((value) => value.label.pt);
    const chosen = libraryValues.find(
      (value) => allowed.find((entry) => entry.isDefault)?.optionValueId === value.id,
    );
    const detail =
      option.type === "choice"
        ? allowedNames.length > 0
          ? `${allowedNames.join(", ")}${chosen ? ` · vem ${chosen.label.pt}` : ""}`
          : "Sem valores disponíveis"
        : option.type === "boolean"
          ? "Sim ou não"
          : `${OPTION_TYPES[option.type as keyof typeof OPTION_TYPES]} · ${limits(
              productOption.min,
              productOption.max,
              option.type === "dimension" ? "mm" : "",
            )}`;
    return (
      <>
        <span className="text-ink font-medium">{option.name.pt}</span>
        {(option.type === "dimension" || option.type === "number") && (
          <span className="text-steel ml-2 text-[13px]">
            <span
              className="text-ink bg-surface-alt rounded-[2px] px-1 font-mono"
              title={`Use ${letter} nas contas da fórmula`}
            >
              {letter}
            </span>
            {option.type === "dimension" && " = metros na fórmula"}
          </span>
        )}
        <span className="text-steel block text-[13px]/[18px] sm:truncate">
          {detail}
          {!productOption.required && " · opcional"}
        </span>
        {/* No telemóvel, o valor do exemplo (à direita no computador) vem aqui. */}
        <span className="block text-[13px]/[18px] tabular-nums sm:hidden">
          <span className="text-steel">No exemplo: </span>
          <span className="text-ink">{optionSample(option.key)}</span>
        </span>
      </>
    );
  };
  const optionSample = (key: string) => {
    const option = optionInfo.find((entry) => entry.key === key);
    const value = input[key];
    if (!option) return null;
    if (option.type === "dimension") return mm(Number(value));
    if (option.type === "choice")
      return option.values.find((candidate) => candidate.key === value)?.label ?? "—";
    if (option.type === "boolean") return value === true ? "Sim" : "Não";
    return String(value);
  };

  const lineItemText = (row: (typeof lines)[number]) => {
    const { line } = row;
    if (line.sectorId) {
      const sector = sources.sectors.find((candidate) => candidate.id === line.sectorId);
      return sector ? `${sector.name} · ${sectorHint(sector).split(" · ")[0]}` : "Secção arquivada";
    }
    if (line.materialId) {
      const article = sources.articles.find((candidate) => candidate.id === line.materialId);
      return article
        ? `${article.name} · ${articleHint(article).split(" · ")[0]}`
        : "Material desaparecido";
    }
    const option = choiceOptions.find((candidate) => candidate.id === line.articleOptionId);
    const mapped = row.mapping
      .map((entry) => sources.articles.find((article) => article.id === entry.materialId)?.name)
      .filter((name): name is string => Boolean(name));
    if (mapped.length === 0) return "Nenhum material escolhido";
    return `${[...new Set(mapped)].join(" ou ")}${option ? `, conforme ${option.name}` : ""}`;
  };
  // No telemóvel, o que está à direita no computador (valor no exemplo, ou porque
  // é que a linha não tem valor) vai para uma linha própria do resumo.
  const mobileAmount = (index: number, unit: string) => {
    const example = examples[index];
    if (!example || !example.applies)
      return (
        <span className="text-steel block text-[13px]/[18px] sm:hidden">não conta no exemplo</span>
      );
    if (!example.ok)
      return <span className="text-danger block text-[13px]/[18px] sm:hidden">não se calcula</span>;
    return (
      <span className="text-ink block text-[13px]/[18px] tabular-nums sm:hidden">
        {numberFormat.format(example.quantity)} {unit} · {formatEuros(example.priceCents)}
      </span>
    );
  };
  const lineSummary = (row: (typeof lines)[number], index: number) => {
    const conditions = conditionsText(row.line.conditions, optionInfo);
    const lineIssues = issuesFor("line", index);
    return (
      <>
        <span className="text-ink font-medium">{row.line.label}</span>
        <span className="text-steel block text-[13px]/[18px] sm:truncate">{lineItemText(row)}</span>
        {conditions && (
          <span className="text-ink-soft block text-[13px]/[18px]">
            {conditions.charAt(0).toUpperCase() + conditions.slice(1)}
          </span>
        )}
        {mobileAmount(index, row.line.unit)}
        {lineIssues.length > 0 && (
          <span className="text-danger block text-[13px]/[18px] font-medium">
            ! {plural(lineIssues.length, "problema", "problemas")}
          </span>
        )}
      </>
    );
  };
  const lineAside = (row: (typeof lines)[number], index: number) => {
    const example = examples[index];
    return (
      <span className="hidden w-48 text-right text-sm tabular-nums sm:block">
        {!example || !example.applies ? (
          <span className="text-steel-light text-[13px]">não conta no exemplo</span>
        ) : example.ok ? (
          <>
            <span className="text-steel mr-3 text-[13px]">
              {numberFormat.format(example.quantity)} {row.line.unit}
            </span>
            <Money cents={example.priceCents} className="text-ink" />
          </>
        ) : (
          <span className="text-danger text-[13px]">não se calcula</span>
        )}
      </span>
    );
  };
  const consumablesPercent = shown ? fractionToPercent(shown.consumablesRate) : "0";
  const consumablesSummary = (
    <>
      <span className="text-ink font-medium">Consumíveis</span>
      <span className="text-steel block text-[13px]/[18px]">
        + {consumablesPercent} % do custo dos materiais (discos, gás, elétrodos)
      </span>
      <span className="text-steel block text-[13px]/[18px] sm:hidden">
        {preview?.ok && preview.consumables ? (
          <>
            Acrescenta{" "}
            <span className="text-ink tabular-nums">
              {formatEuros(preview.consumables.priceCents)}
            </span>{" "}
            no exemplo
          </>
        ) : (
          "Nada no exemplo"
        )}
      </span>
    </>
  );
  const consumablesAside = (
    <span className="hidden text-right text-[13px] sm:block">
      {preview?.ok && preview.consumables ? (
        <span className="text-steel">
          Acrescenta <Money cents={preview.consumables.priceCents} className="text-ink text-sm" />{" "}
          no exemplo
        </span>
      ) : (
        <span className="text-steel-light">nada no exemplo</span>
      )}
    </span>
  );

  // Exemplo trabalhado com a primeira linha calculada (para a ajuda do preço).
  const firstPriced = preview?.ok ? preview.lines.find((line) => line.sourceIndex !== null) : null;
  const firstDimension = optionInfo.find((option) => option.type === "dimension");
  const firstLetter = firstDimension
    ? (model?.input.options.find((option) => option.key === firstDimension.key)?.var ??
      firstDimension.key)
    : "L";

  const versionLabel = shown ? `versão ${shown.version}` : "";
  const ruleScope = shown ? { productId: product.id, versionId: shown.id } : null;

  return (
    <PageBody>
      <InlineEditGroup>
        <div id="produto-cabecalho">
          <PageHeader
            crumbs={[{ href: "/admin/produtos", label: "Produtos" }]}
            leading={
              <a
                href="#montra"
                className="focus-visible:ring-amber-ink shrink-0 rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                aria-label={product.imageUrl ? "Ver a imagem" : "Carregar imagem"}
              >
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- miniatura do R2, já recortada pelo foco
                  <img
                    src={product.imageUrl}
                    alt=""
                    className="border-line size-14 rounded-[2px] border object-cover"
                    style={{ objectPosition: objectPosition(product.imageFocus) }}
                  />
                ) : (
                  <span className="border-warn-line bg-warn-bg text-warn flex size-14 flex-col items-center justify-center gap-0.5 rounded-[2px] border text-[11px] font-medium">
                    <ImageOff aria-hidden className="size-4" strokeWidth={1.75} />
                    Sem imagem
                  </span>
                )}
              </a>
            }
            title={product.name.pt}
            status={
              <>
                {shown && <VersionStatusBadge status={shown.status as VersionStatus} />}
                {product.archivedAt && <StatusBadge tone="quiet">Arquivado</StatusBadge>}
              </>
            }
            description={
              <>
                {category?.label ?? "Sem categoria"}
                {working && published && ` · Na loja: versão ${published.version}`}
                {!published && " · Ainda não está na loja"}
                {!working && published?.publishedAt && (
                  <> · Na loja desde {formatDateTime(published.publishedAt)}</>
                )}
                {!product.imageUrl && (
                  <>
                    {" · "}
                    <a
                      href="#montra"
                      className="text-warn font-medium underline underline-offset-4"
                    >
                      Falta a imagem: carregar
                    </a>
                  </>
                )}
              </>
            }
            actions={
              <>
                {shopHref && (
                  <Button asChild variant="ghost">
                    <a href={shopHref} target="_blank" rel="noopener">
                      Ver na loja
                      <ArrowUpRight aria-hidden strokeWidth={1.75} />
                    </a>
                  </Button>
                )}
                {primaryAction}
              </>
            }
            className="mb-4"
          />
        </div>

        {shown && <SectionNav steps={steps} headerId="produto-cabecalho" action={primaryAction} />}

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <div className="min-w-0 space-y-12">
            {/* ── 1. Montra: muda logo na loja ── */}
            <Section
              id="montra"
              title="Montra"
              description="Nome, endereço, descrição e imagem. Muda logo na loja, sem publicar."
            >
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
                <Panel className="[&_[role=region]]:mx-0 [&_[role=region]]:-mb-5 [&_[role=region]]:px-0">
                  <ProductForm
                    id={product.id}
                    categories={categories}
                    initial={{
                      name: product.name.pt,
                      slug: product.slug,
                      categoryId: product.categoryId,
                      description: product.description?.pt ?? "",
                    }}
                  />
                </Panel>
                <Panel>
                  <h3 className="text-ink mb-3 text-[15px]/[22px] font-semibold">Imagem</h3>
                  <ImageField
                    slot="product"
                    id={product.id}
                    initialUrl={product.imageUrl}
                    initialFocus={product.imageFocus}
                    layout="aside"
                  />
                </Panel>
              </div>
            </Section>

            {/* ── Configuração e preço: muda na loja só ao publicar ── */}
            {shown && (
              <div className="space-y-12">
                <div className="border-ink grid gap-3 border-t-2 pt-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-ink text-lg/[26px] font-semibold">
                      Configuração e preço — {versionLabel}
                    </h2>
                    <VersionStatusBadge status={shown.status as VersionStatus} />
                  </div>
                  {editable ? (
                    <p className="text-steel max-w-[68ch] text-sm">
                      {published
                        ? `Está a mexer numa cópia. A loja continua a mostrar a versão ${published.version} até publicar.`
                        : "O produto só aparece na loja depois de o publicar."}
                    </p>
                  ) : (
                    <Notice
                      tone="info"
                      action={
                        published && (
                          <form action={createDraftAction.bind(null, product.id, published.id)}>
                            <Button type="submit" variant="outline" size="sm">
                              Fazer alterações
                            </Button>
                          </form>
                        )
                      }
                    >
                      Esta é a versão que os clientes veem. Para mudar medidas, opções ou preço,
                      carregue em Fazer alterações; a loja continua igual até publicar.
                    </Notice>
                  )}
                </div>

                {/* ── 2. Opções ── */}
                <Section
                  id="opcoes"
                  title="Opções"
                  count={optionCount}
                  description="Pela ordem em que o cliente as preenche. As medidas escrevem-se em mm; na fórmula contam em metros."
                  actions={
                    editable &&
                    optionCount > 0 && (
                      <OpenRowButton rowId="nova-opcao">Acrescentar opção</OpenRowButton>
                    )
                  }
                >
                  {optionCount === 0 && (
                    <EmptyState
                      title="Ainda sem opções"
                      action={
                        editable && (
                          <OpenRowButton rowId="nova-opcao">Acrescentar opção</OpenRowButton>
                        )
                      }
                    >
                      Acrescente as medidas e escolhas que o cliente preenche (ex.: Largura, Altura,
                      Material). Depois, as linhas de custo usam-nas nas contas.
                    </EmptyState>
                  )}
                  {optionCount > 0 && (
                    <RowList label="Opções do produto">
                      {versionOptions.map((row, index) => {
                        const { productOption, option, allowed, libraryValues } = row;
                        const anchor = `opcao-${productOption.id}`;
                        const sample = (
                          <span className="text-steel hidden max-w-40 truncate text-[13px] tabular-nums sm:inline">
                            {optionSample(option.key)}
                          </span>
                        );
                        if (!editable)
                          return (
                            <StaticRow
                              key={productOption.id}
                              id={anchor}
                              summary={optionSummary(row)}
                              aside={sample}
                            />
                          );
                        return (
                          <InlineEditRow
                            key={productOption.id}
                            id={anchor}
                            label={option.name.pt}
                            summary={optionSummary(row)}
                            problem={option.type === "choice" && allowed.length === 0}
                            dangerLabel="Remover do produto…"
                            aside={
                              <>
                                {sample}
                                <ReorderButtons
                                  itemLabel={option.name.pt}
                                  upAction={
                                    index > 0
                                      ? moveOptionAction.bind(
                                          null,
                                          product.id,
                                          productOption.id,
                                          -1,
                                        )
                                      : undefined
                                  }
                                  downAction={
                                    index < versionOptions.length - 1
                                      ? moveOptionAction.bind(null, product.id, productOption.id, 1)
                                      : undefined
                                  }
                                />
                              </>
                            }
                          >
                            <ProductOptionForm
                              productId={product.id}
                              productOptionId={productOption.id}
                              initial={{
                                type: option.type,
                                name: option.name.pt,
                                optionKey: option.key,
                                var: productOption.var ?? "",
                                required: productOption.required,
                                min: productOption.min?.toString() ?? "",
                                max: productOption.max?.toString() ?? "",
                                step: productOption.step?.toString() ?? "",
                                values: libraryValues
                                  .filter(
                                    (value) =>
                                      !value.archivedAt ||
                                      allowed.some((entry) => entry.optionValueId === value.id),
                                  )
                                  .map((value) => ({
                                    id: value.id,
                                    label: value.label.pt,
                                    key: value.key,
                                    archived: Boolean(value.archivedAt),
                                  })),
                                allowed: allowed.map((entry) => entry.optionValueId),
                                defaultValueId:
                                  allowed.find((entry) => entry.isDefault)?.optionValueId ?? "",
                              }}
                            />
                            <DangerZone>
                              <form
                                action={removeOptionAction.bind(null, product.id, productOption.id)}
                              >
                                <ConfirmButton
                                  label="Remover do produto"
                                  question={`Remover «${option.name.pt}» deste produto?`}
                                  consequence="As linhas de custo e as regras que a usam deixam de se calcular até as corrigir."
                                  confirmLabel="Remover"
                                />
                              </form>
                            </DangerZone>
                          </InlineEditRow>
                        );
                      })}
                    </RowList>
                  )}
                  {editable && working && (
                    <AddRow id="nova-opcao" label="Nova opção, escolhida da biblioteca">
                      <AddOptionForm
                        productId={product.id}
                        versionId={working.id}
                        available={available}
                      />
                    </AddRow>
                  )}
                </Section>

                {/* ── 3. Regras ── */}
                <Section
                  id="regras"
                  title="Regras"
                  count={rules.length}
                  description="Combinações que não se fazem, ou que mudam o que o cliente pode escolher."
                  actions={
                    editable &&
                    optionCount > 0 && (
                      <OpenRowButton rowId="nova-regra">Acrescentar regra</OpenRowButton>
                    )
                  }
                >
                  {rules.length === 0 && (
                    <p className="text-steel mb-3 text-sm">
                      {optionCount === 0
                        ? "Primeiro acrescente opções: as regras dependem delas."
                        : "Sem regras: o cliente pode combinar tudo."}
                    </p>
                  )}
                  {rules.length > 0 && (
                    <RowList label="Regras do produto">
                      {rules.map((rule, index) => {
                        const sentence = describeRule(ruleValues[index]!, optionInfo);
                        const ruleIssues = ruleIssuesByIndex.get(index) ?? [];
                        const summary = (
                          <>
                            <span className="text-ink">{sentence}</span>
                            {ruleIssues.length > 0 && (
                              <span className="text-danger block text-[13px]/[18px] font-medium">
                                ! {ruleIssues[0]}
                              </span>
                            )}
                          </>
                        );
                        if (!editable || !ruleScope)
                          return (
                            <StaticRow key={rule.id} id={`regra-${rule.id}`} summary={summary} />
                          );
                        return (
                          <InlineEditRow
                            key={rule.id}
                            id={`regra-${rule.id}`}
                            label={`regra ${index + 1}`}
                            summary={summary}
                            problem={false}
                            dangerLabel="Apagar regra…"
                            cleanOnSubmit
                          >
                            <RuleForm
                              scope={ruleScope}
                              ruleId={rule.id}
                              initial={ruleValues[index]!}
                              options={optionInfo}
                              issues={ruleIssues}
                            />
                            <DangerZone>
                              <form action={removeRuleAction.bind(null, ruleScope, rule.id)}>
                                <ConfirmButton
                                  label="Apagar regra"
                                  question="Apagar esta regra?"
                                  consequence={`«${sentence}» deixa de valer neste produto.`}
                                  confirmLabel="Apagar"
                                />
                              </form>
                            </DangerZone>
                          </InlineEditRow>
                        );
                      })}
                    </RowList>
                  )}
                  {editable && ruleScope && optionCount > 0 && (
                    <AddRow id="nova-regra" label="Nova regra">
                      <RuleForm
                        scope={ruleScope}
                        ruleId={null}
                        initial={{
                          conditions: [],
                          effect: { type: "restrict", option: "", values: [] },
                          message: "",
                        }}
                        options={optionInfo}
                      />
                    </AddRow>
                  )}
                  <div className="mt-6">
                    <h3 className="text-ink text-[15px]/[22px] font-semibold">
                      Também se aplicam (da biblioteca)
                    </h3>
                    {libraryRules.length > 0 ? (
                      <ul className="text-ink-soft mt-2 grid list-disc gap-1 pl-5 text-sm">
                        {libraryRules.map((rule) => (
                          <li key={rule.id}>
                            {describeRule(
                              {
                                conditions: rule.conditions,
                                effect: rule.effect,
                                message: rule.message?.pt ?? "",
                              },
                              optionInfo,
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-steel mt-1 text-sm">
                        Nenhuma regra da biblioteca usa as opções deste produto.
                      </p>
                    )}
                    <p className="mt-2 text-[13px]">
                      <Link href="/admin/opcoes/regras" className="link-admin">
                        Ver as regras da biblioteca
                      </Link>
                    </p>
                  </div>
                </Section>

                {/* ── 4. Preço ── */}
                <Section
                  id="preco"
                  title="Preço"
                  count={plural(lines.length, "linha", "linhas")}
                  description={`Cada linha é um custo. Na fórmula, as medidas estão em metros: 3 000 mm → ${firstLetter} = 3.`}
                  actions={
                    editable &&
                    lines.length > 0 && (
                      <OpenRowButton rowId="nova-linha">Acrescentar linha</OpenRowButton>
                    )
                  }
                >
                  <Help title="Como se chega ao preço?" className="mb-4">
                    {firstPriced ? (
                      <p>
                        Cada linha soma a sua margem ao custo. No exemplo, «{firstPriced.label}»:{" "}
                        {numberFormat.format(Number(firstPriced.quantity))} {firstPriced.unit} ×{" "}
                        {formatEuros(Math.round(Number(firstPriced.unitCost) * 100))} ={" "}
                        {formatEuros(firstPriced.costCents)}, mais{" "}
                        {fractionToPercent(Number(firstPriced.margin).toFixed(4))} % de margem ={" "}
                        {formatEuros(firstPriced.priceCents)}.
                      </p>
                    ) : (
                      <p>
                        Cada linha é quantidade × custo do material (ou horas × custo por hora da
                        secção), mais a margem desse material ou secção.
                      </p>
                    )}
                    <p>
                      As margens definem-se em{" "}
                      <Link href="/admin/materiais" className="link-admin">
                        Materiais e custos
                      </Link>{" "}
                      e em{" "}
                      <Link href="/admin/mao-de-obra" className="link-admin">
                        Mão de obra
                      </Link>
                      . O preço na loja soma as linhas, os consumíveis e o IVA.
                    </p>
                  </Help>
                  {lines.length === 0 && (
                    <EmptyState
                      title="Ainda sem linhas de custo"
                      action={
                        editable && (
                          <OpenRowButton rowId="nova-linha">Acrescentar linha</OpenRowButton>
                        )
                      }
                    >
                      Cada linha é um custo: um material, uma hora de oficina, um serviço externo.
                      {optionCount === 0 && " Acrescente primeiro as opções: as contas usam-nas."}
                    </EmptyState>
                  )}
                  {lines.length > 0 && (
                    <RowList label="Linhas de custo">
                      {lines.map((row, index) => {
                        const anchor = `linha-${row.line.id}`;
                        if (!editable)
                          return (
                            <StaticRow
                              key={row.line.id}
                              id={anchor}
                              summary={lineSummary(row, index)}
                              aside={lineAside(row, index)}
                            />
                          );
                        return (
                          <InlineEditRow
                            key={row.line.id}
                            id={anchor}
                            label={row.line.label}
                            summary={lineSummary(row, index)}
                            dangerLabel="Apagar linha…"
                            aside={
                              <>
                                {lineAside(row, index)}
                                <ReorderButtons
                                  itemLabel={row.line.label}
                                  upAction={
                                    index > 0
                                      ? moveFormulaItemAction.bind(
                                          null,
                                          product.id,
                                          "line",
                                          row.line.id,
                                          -1,
                                        )
                                      : undefined
                                  }
                                  downAction={
                                    index < lines.length - 1
                                      ? moveFormulaItemAction.bind(
                                          null,
                                          product.id,
                                          "line",
                                          row.line.id,
                                          1,
                                        )
                                      : undefined
                                  }
                                />
                              </>
                            }
                          >
                            <LineForm
                              productId={product.id}
                              versionId={shown.id}
                              lineId={row.line.id}
                              initial={lineValues(row)}
                              options={optionInfo}
                              choiceOptions={choiceOptions}
                              sources={sources}
                              issues={issuesFor("line", index)}
                              context={formulaContext}
                            />
                            <DangerZone>
                              <form
                                action={removeFormulaItemAction.bind(
                                  null,
                                  product.id,
                                  "line",
                                  row.line.id,
                                )}
                              >
                                <ConfirmButton
                                  label="Apagar linha"
                                  question={`Apagar a linha «${row.line.label}»?`}
                                  consequence="O preço deixa de contar este custo."
                                  confirmLabel="Apagar"
                                />
                              </form>
                            </DangerZone>
                          </InlineEditRow>
                        );
                      })}
                      {lines.length > 0 &&
                        (editable ? (
                          <InlineEditRow
                            id="consumiveis"
                            label="Consumíveis"
                            summary={consumablesSummary}
                            aside={consumablesAside}
                          >
                            <ConsumablesForm
                              productId={product.id}
                              versionId={shown.id}
                              percent={consumablesPercent}
                            />
                          </InlineEditRow>
                        ) : (
                          <StaticRow
                            id="consumiveis"
                            summary={consumablesSummary}
                            aside={consumablesAside}
                          />
                        ))}
                    </RowList>
                  )}
                  {editable && (
                    <AddRow id="nova-linha" label="Nova linha de custo">
                      <LineForm
                        productId={product.id}
                        versionId={shown.id}
                        lineId={null}
                        initial={{
                          label: "",
                          kind: "material",
                          quantityExpr: "",
                          unit: "",
                          conditions: [],
                          source: "fixed",
                          sectorId: "",
                          materialId: "",
                          articleOptionId: "",
                          mapping: [],
                        }}
                        options={optionInfo}
                        choiceOptions={choiceOptions}
                        sources={sources}
                        issues={[]}
                        context={formulaContext}
                      />
                    </AddRow>
                  )}
                </Section>

                {/* Contas auxiliares: depois das linhas, fechadas por defeito */}
                <Section
                  id="contas"
                  title="Contas auxiliares"
                  count={variables.length}
                  description="Valores intermédios que as linhas usam (ex.: número de barras ou de degraus). Cada conta pode usar as de cima."
                  actions={
                    editable && (
                      <OpenRowButton rowId="nova-conta">Criar valor intermédio</OpenRowButton>
                    )
                  }
                >
                  {variables.length === 0 && (
                    <p className="text-steel text-sm">
                      Sem contas auxiliares. Só são precisas quando várias linhas repetem a mesma
                      conta.
                    </p>
                  )}
                  {variables.length > 0 && (
                    <RowList label="Contas auxiliares">
                      {variables.map((variable, index) => {
                        const label = variable.label?.pt || variable.name;
                        const value = scope[variable.name];
                        const variableIssues = issuesFor("variable", index);
                        const summary = (
                          <>
                            <span className="text-ink font-medium">{label}</span>
                            <span className="text-steel block truncate font-mono text-[13px]/[18px]">
                              {variable.expr}
                            </span>
                            {/* No telemóvel, o resultado no exemplo vem aqui. */}
                            {value !== undefined && (
                              <span className="text-steel block text-[13px]/[18px] tabular-nums sm:hidden">
                                = <span className="text-ink">{numberFormat.format(value)}</span> no
                                exemplo
                              </span>
                            )}
                            {variableIssues.length > 0 && (
                              <span className="text-danger block text-[13px]/[18px] font-medium">
                                ! {variableIssues[0]}
                              </span>
                            )}
                          </>
                        );
                        const aside = (
                          <span className="text-steel hidden text-[13px] tabular-nums sm:inline">
                            {value === undefined ? (
                              "—"
                            ) : (
                              <>
                                ={" "}
                                <span className="text-ink text-sm">
                                  {numberFormat.format(value)}
                                </span>{" "}
                                no exemplo
                              </>
                            )}
                          </span>
                        );
                        const anchor = `conta-${variable.id}`;
                        if (!editable)
                          return (
                            <StaticRow
                              key={variable.id}
                              id={anchor}
                              summary={summary}
                              aside={aside}
                            />
                          );
                        return (
                          <InlineEditRow
                            key={variable.id}
                            id={anchor}
                            label={label}
                            summary={summary}
                            dangerLabel="Apagar conta…"
                            aside={
                              <>
                                {aside}
                                <ReorderButtons
                                  itemLabel={label}
                                  upAction={
                                    index > 0
                                      ? moveFormulaItemAction.bind(
                                          null,
                                          product.id,
                                          "variable",
                                          variable.id,
                                          -1,
                                        )
                                      : undefined
                                  }
                                  downAction={
                                    index < variables.length - 1
                                      ? moveFormulaItemAction.bind(
                                          null,
                                          product.id,
                                          "variable",
                                          variable.id,
                                          1,
                                        )
                                      : undefined
                                  }
                                />
                              </>
                            }
                          >
                            <VariableForm
                              productId={product.id}
                              versionId={shown.id}
                              variableId={variable.id}
                              index={index}
                              issues={variableIssues}
                              context={formulaContext}
                              initial={{
                                name: variable.name,
                                expr: variable.expr,
                                label: variable.label?.pt ?? "",
                                showToCustomer: variable.showToCustomer,
                              }}
                            />
                            <DangerZone>
                              <form
                                action={removeFormulaItemAction.bind(
                                  null,
                                  product.id,
                                  "variable",
                                  variable.id,
                                )}
                              >
                                <ConfirmButton
                                  label="Apagar conta"
                                  question={`Apagar a conta «${label}»?`}
                                  consequence="As linhas que a usam deixam de se calcular até as corrigir."
                                  confirmLabel="Apagar"
                                />
                              </form>
                            </DangerZone>
                          </InlineEditRow>
                        );
                      })}
                    </RowList>
                  )}
                  {editable && (
                    <AddRow id="nova-conta" label="Novo valor intermédio">
                      <VariableForm
                        productId={product.id}
                        versionId={shown.id}
                        variableId={null}
                        index={variables.length}
                        issues={[]}
                        context={formulaContext}
                        initial={{ name: "", expr: "", label: "", showToCustomer: false }}
                      />
                    </AddRow>
                  )}
                </Section>

                {/* ── 5. Publicar ── */}
                {costItems.length > 0 && (
                  <Section
                    id="custos"
                    title="Custos deste produto"
                    count={costItems.filter((item) => item.own).length || undefined}
                    description={
                      editable
                        ? "Por omissão o produto usa o custo e a margem gerais (de Materiais e custos e de Mão de obra). Escreva só o que neste produto é diferente; apague para voltar ao geral. Um custo escrito aqui fica fixo e não segue o Odoo."
                        : "Custo e margem usados por este produto. Para mudar, carregue em Fazer alterações."
                    }
                  >
                    <CostTable
                      productId={product.id}
                      versionId={editable && working ? working.id : null}
                      items={costItems}
                    />
                  </Section>
                )}

                <Section id="publicar" title="Publicar">
                  <Panel className="grid gap-4">
                    {!working ? (
                      <p className="text-ink-soft text-sm">
                        Esta versão está na loja
                        {published?.publishedAt
                          ? ` desde ${formatDateTime(published.publishedAt)}`
                          : ""}
                        . Para mudar opções, regras ou preço, carregue em Fazer alterações no topo.
                      </p>
                    ) : blockingCount > 0 ? (
                      <div className="grid gap-2">
                        <p className="text-ink text-sm font-semibold">
                          Falta resolver {plural(blockingCount, "coisa", "coisas")} antes de
                          publicar
                        </p>
                        <ul className="grid gap-2">
                          {(located.length > 0
                            ? located
                            : problems!.blocking.map((message) => ({
                                message,
                                href: "#publicar",
                                section: "preco" as const,
                              }))
                          ).map((problem) => (
                            <li
                              key={`${problem.href}-${problem.message}`}
                              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm"
                            >
                              <span className="text-ink-soft">{problem.message}</span>
                              {problem.href !== "#publicar" &&
                                (problem.href.startsWith("#") ? (
                                  <a href={problem.href} className="link-admin shrink-0">
                                    Corrigir
                                  </a>
                                ) : (
                                  <Link href={problem.href} className="link-admin shrink-0">
                                    Corrigir
                                  </Link>
                                ))}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <p className="text-ink-soft max-w-prose text-sm">
                          Está tudo pronto. Confira o preço de exemplo com um orçamento real e
                          publique: a loja passa a mostrar a {versionLabel}.
                        </p>
                        {publishDialog("outline")}
                      </div>
                    )}
                    {working && warnings.length > 0 && (
                      <Notice tone="warn" title="Convém ver antes de publicar">
                        <ul className="grid gap-0.5">
                          {warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      </Notice>
                    )}
                  </Panel>
                </Section>
              </div>
            )}
          </div>

          {shown && model && optionInfo.length > 0 && (
            <SamplePrice
              versionId={shown.id}
              options={optionInfo.map((option) => ({
                key: option.key,
                name: option.name,
                type: option.type,
                values: option.values.map((value) => ({ key: value.key, label: value.label })),
              }))}
              initialInput={input}
              initialResult={preview}
              stamp={stampOf(model)}
              lineAnchors={lines.map(({ line }) => `linha-${line.id}`)}
            />
          )}
        </div>
      </InlineEditGroup>
    </PageBody>
  );
}

/** Impressão digital do modelo de preço: muda quando opções, linhas ou custos mudam. */
function stampOf(model: NonNullable<Awaited<ReturnType<typeof loadPricingModel>>>) {
  const text = JSON.stringify(model.input, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
  let hash = 0;
  for (let index = 0; index < text.length; index++) {
    hash = (hash * 31 + text.charCodeAt(index)) | 0;
  }
  return `${text.length}-${hash}`;
}
