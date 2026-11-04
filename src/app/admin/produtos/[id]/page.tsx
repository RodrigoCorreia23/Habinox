import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ImageField } from "@/components/admin/image-field";
import { Button } from "@/components/ui/button";
import type { OptionType } from "@/lib/options";
import { requireAdmin } from "@/server/auth/session";
import { listOptions, OPTION_TYPES } from "@/server/catalog/options";
import { fractionToPercent } from "@/lib/percent";
import { validateFormula } from "@/lib/pricing";
import {
  listFormulaSources,
  listLines,
  listVariables,
  loadPricingModel,
} from "@/server/catalog/formula";
import { getProduct, listLeafCategories, listVersionOptions } from "@/server/catalog/products";
import { createDraftAction, moveOptionAction, removeOptionAction } from "../actions";
import { AddOptionForm, ProductForm, ProductOptionForm, PublishPanel } from "../forms";
import { removeRuleAction } from "../../rule-actions";
import { describeRule } from "@/components/admin/describe-rule";
import { RuleForm } from "@/components/admin/rule-form";
import { checkVersion, listRules } from "@/server/catalog/rules";
import { validateRules } from "@/lib/options";
import { moveFormulaItemAction, removeFormulaItemAction } from "../formula-actions";
import {
  ConsumablesForm,
  type LineValues,
  LineForm,
  type OptionInfo,
  PreviewPanel,
  VariableForm,
} from "../formula-forms";

export const metadata: Metadata = { title: "Produto · Habinox" };

const STATUS: Record<string, string> = {
  draft: "Rascunho",
  validated: "Validada",
  published: "Publicada",
};

function limits(min: number | null, max: number | null, unit: string) {
  if (min === null && max === null) return "sem limites";
  const format = (value: number) => `${value.toLocaleString("pt-PT")}${unit}`;
  if (min !== null && max !== null) return `${format(min)} a ${format(max)}`;
  return min !== null ? `a partir de ${format(min)}` : `até ${format(max!)}`;
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

  const [categories, versionOptions, library, variables, lines, sources, model] = await Promise.all(
    [
      listLeafCategories(),
      shown ? listVersionOptions(shown.id) : Promise.resolve([]),
      listOptions(),
      shown ? listVariables(shown.id) : Promise.resolve([]),
      shown ? listLines(shown.id) : Promise.resolve([]),
      listFormulaSources(),
      shown ? loadPricingModel(shown.id) : Promise.resolve(null),
    ],
  );
  const [rules, problems] = await Promise.all([
    shown ? listRules(shown.id) : Promise.resolve([]),
    working ? checkVersion(working.id) : Promise.resolve(null),
  ]);
  const ruleValues = rules.map((rule) => ({
    conditions: rule.conditions,
    effect: rule.effect,
    message: rule.message?.pt ?? "",
  }));
  const ruleIssues = model
    ? validateRules(
        model.input.options,
        ruleValues.map(({ conditions, effect }) => ({ conditions, effect })),
      )
    : [];

  // Opções para as condições, o preço de exemplo e o artigo "conforme a opção".
  const optionInfo: OptionInfo[] = (model?.meta ?? []).map((option) => ({
    key: option.key,
    name: option.name,
    type: option.type,
    unit: option.unit,
    values: option.values,
  }));
  const choiceOptions = versionOptions
    .filter((row) => row.option.type === "choice")
    .map((row) => ({
      id: row.option.id,
      key: row.option.key,
      name: row.option.name.pt,
      values: row.libraryValues
        .filter((value) => row.allowed.some((allowed) => allowed.optionValueId === value.id))
        .map((value) => ({ id: value.id, key: value.key, label: value.label.pt })),
    }));
  const issues = model
    ? validateFormula({
        options: model.input.options,
        variables: variables.map((variable) => ({ name: variable.name, expr: variable.expr })),
        lines: lines.map(({ line }) => ({ quantityExpr: line.quantityExpr })),
      })
    : [];
  const issuesFor = (kind: "variable" | "line", index: number) =>
    issues
      .filter((issue) => issue.where.kind === kind && issue.where.index === index)
      .map((issue) => issue.message);
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
      label: `${option.name.pt} (${OPTION_TYPES[option.type as OptionType].toLowerCase()})`,
    }));

  return (
    <main className="grid gap-8 px-4 py-6 md:px-6">
      <header className="grid gap-1">
        <p className="text-steel text-sm">
          <Link href="/admin/produtos" className="underline-offset-4 hover:underline">
            Produtos
          </Link>
        </p>
        <h1 className="text-xl font-semibold tracking-tight">{product.name.pt}</h1>
        <p className="text-steel text-sm">
          {shown ? `Versão ${shown.version} · ${STATUS[shown.status]}` : "Sem versões"}
          {published && working && ` · na loja está a versão ${published.version}`}
          {!published && " · ainda não está na loja"}
        </p>
      </header>

      {!editable && published && (
        <div className="border-line bg-surface flex flex-wrap items-center justify-between gap-4 border px-4 py-3 text-sm">
          <p>
            A versão publicada não se altera (os orçamentos apontam para ela). Para mudar opções ou
            a fórmula, crie uma versão nova a partir desta.
          </p>
          <form action={createDraftAction.bind(null, product.id, published.id)}>
            <Button type="submit" size="sm">
              Criar versão nova
            </Button>
          </form>
        </div>
      )}

      {working && problems && (
        <PublishPanel
          productId={product.id}
          versionId={working.id}
          status={working.status}
          blocking={problems.blocking}
          warnings={problems.warnings}
        />
      )}

      <details className="border-line bg-surface border" open={!product.imageUrl || undefined}>
        <summary className="cursor-pointer px-4 py-3 font-semibold">
          Imagem{" "}
          {!product.imageUrl && (
            <span className="text-error text-xs font-normal">· sem imagem</span>
          )}
        </summary>
        <div className="px-4 pb-4">
          <ImageField
            slot="product"
            id={product.id}
            initialUrl={product.imageUrl}
            initialFocus={product.imageFocus}
          />
        </div>
      </details>

      <details className="border-line bg-surface border">
        <summary className="cursor-pointer px-4 py-3 font-semibold">Dados do produto</summary>
        <div className="px-4 pb-4">
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
        </div>
      </details>

      <section aria-labelledby="opcoes" className="grid gap-3">
        <div>
          <h2 id="opcoes" className="font-semibold">
            Opções
          </h2>
          <p className="text-steel text-sm">
            Pela ordem em que o cliente as preenche. As regras só podem depender de opções que
            estejam acima da opção que afetam.
          </p>
        </div>

        {versionOptions.length === 0 ? (
          <p className="text-steel border-line bg-surface border px-4 py-6 text-sm">
            O produto ainda não tem opções.
          </p>
        ) : (
          <ol className="border-line bg-surface divide-line-soft divide-y border">
            {versionOptions.map(({ productOption, option, allowed, libraryValues }, index) => {
              const unit = option.type === "dimension" ? " mm" : "";
              const summary =
                option.type === "choice"
                  ? `${allowed.length} de ${libraryValues.filter((value) => !value.archivedAt).length} valores`
                  : option.type === "boolean"
                    ? "sim / não"
                    : limits(productOption.min, productOption.max, unit);
              return (
                <li key={productOption.id}>
                  <details className="group">
                    <summary className="hover:bg-canvas flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                      <span className="text-steel w-5 text-right tabular-nums">{index + 1}</span>
                      <span className="font-medium">{option.name.pt}</span>
                      <span className="text-steel font-mono text-xs">
                        {productOption.var ?? option.key}
                      </span>
                      <span className="text-steel text-xs">
                        {OPTION_TYPES[option.type as OptionType]} · {summary}
                        {!productOption.required && " · opcional"}
                      </span>
                      {editable && (
                        <span className="text-brand ml-auto text-xs group-open:hidden">Editar</span>
                      )}
                    </summary>
                    <div className="grid gap-3 px-4 pt-1 pb-4">
                      {editable ? (
                        <>
                          <ProductOptionForm
                            productId={product.id}
                            productOptionId={productOption.id}
                            initial={{
                              type: option.type,
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
                                    allowed.some((row) => row.optionValueId === value.id),
                                )
                                .map((value) => ({
                                  id: value.id,
                                  label: value.label.pt,
                                  key: value.key,
                                  archived: Boolean(value.archivedAt),
                                })),
                              allowed: allowed.map((row) => row.optionValueId),
                              defaultValueId:
                                allowed.find((row) => row.isDefault)?.optionValueId ?? "",
                            }}
                          />
                          <div className="flex flex-wrap justify-end gap-1">
                            <form
                              action={moveOptionAction.bind(null, product.id, productOption.id, -1)}
                            >
                              <Button
                                type="submit"
                                size="sm"
                                variant="ghost"
                                disabled={index === 0}
                              >
                                Subir
                              </Button>
                            </form>
                            <form
                              action={moveOptionAction.bind(null, product.id, productOption.id, 1)}
                            >
                              <Button
                                type="submit"
                                size="sm"
                                variant="ghost"
                                disabled={index === versionOptions.length - 1}
                              >
                                Descer
                              </Button>
                            </form>
                            <form
                              action={removeOptionAction.bind(null, product.id, productOption.id)}
                            >
                              <Button type="submit" size="sm" variant="ghost">
                                Tirar do produto
                              </Button>
                            </form>
                          </div>
                        </>
                      ) : (
                        <p className="text-steel text-sm">
                          {option.type === "choice"
                            ? libraryValues
                                .filter((value) =>
                                  allowed.some((row) => row.optionValueId === value.id),
                                )
                                .map((value) => value.label.pt)
                                .join(", ")
                            : summary}
                        </p>
                      )}
                    </div>
                  </details>
                </li>
              );
            })}
          </ol>
        )}

        {editable && working && (
          <div className="border-line bg-surface border px-4 py-3">
            <AddOptionForm productId={product.id} versionId={working.id} available={available} />
          </div>
        )}
      </section>

      {shown && (
        <section aria-labelledby="regras" className="grid gap-3">
          <div>
            <h2 id="regras" className="font-semibold">
              Regras deste produto
            </h2>
            <p className="text-steel text-sm">
              Juntam-se às{" "}
              <Link
                href="/admin/opcoes/regras"
                className="text-brand underline-offset-4 hover:underline"
              >
                regras da biblioteca
              </Link>{" "}
              (ex.: inox → escovado ou polido), que valem em todos os produtos.
            </p>
          </div>
          {rules.length > 0 && (
            <ol className="border-line bg-surface divide-line-soft divide-y border">
              {rules.map((rule, index) => {
                const issues = ruleIssues
                  .filter((issue) => issue.index === index)
                  .map((issue) => issue.message);
                return (
                  <li key={rule.id}>
                    <details className="group">
                      <summary className="hover:bg-canvas flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                        <span>{describeRule(ruleValues[index]!, optionInfo)}</span>
                        {issues.length > 0 && (
                          <span className="text-error text-xs">{issues[0]}</span>
                        )}
                        {editable && (
                          <span className="text-brand ml-auto text-xs group-open:hidden">
                            Editar
                          </span>
                        )}
                      </summary>
                      {editable && (
                        <div className="grid gap-3 px-4 pt-1 pb-4">
                          <RuleForm
                            scope={{ productId: product.id, versionId: shown.id }}
                            ruleId={rule.id}
                            initial={ruleValues[index]!}
                            options={optionInfo}
                            issues={issues}
                          />
                          <form
                            action={removeRuleAction.bind(
                              null,
                              { productId: product.id, versionId: shown.id },
                              rule.id,
                            )}
                            className="flex justify-end"
                          >
                            <Button type="submit" size="sm" variant="ghost">
                              Apagar regra
                            </Button>
                          </form>
                        </div>
                      )}
                    </details>
                  </li>
                );
              })}
            </ol>
          )}
          {editable && optionInfo.length > 0 && (
            <details className="border-line bg-surface border">
              <summary className="text-brand cursor-pointer px-4 py-3 text-sm">
                + Nova regra
              </summary>
              <div className="px-4 pb-4">
                <RuleForm
                  scope={{ productId: product.id, versionId: shown.id }}
                  ruleId={null}
                  initial={{
                    conditions: [],
                    effect: { type: "restrict", option: "", values: [] },
                    message: "",
                  }}
                  options={optionInfo}
                />
              </div>
            </details>
          )}
        </section>
      )}

      {shown && (
        <section aria-labelledby="formula" className="grid gap-6">
          <div>
            <h2 id="formula" className="font-semibold">
              Fórmula de preço
            </h2>
            <p className="text-steel text-sm">
              Cada linha: quantidade × custo do artigo (ou horas × custo/hora do sector) × (1 +
              margem do artigo ou do sector). As margens definem-se em Materiais e custos e em Mão
              de obra.
            </p>
          </div>

          <ConsumablesForm
            productId={product.id}
            versionId={shown.id}
            percent={fractionToPercent(shown.consumablesRate)}
            disabled={!editable}
          />

          <div className="grid gap-3">
            <h3 className="text-sm font-semibold">Variáveis calculadas</h3>
            <p className="text-steel text-xs">
              Números intermédios com nome, usados nas linhas (ex.: degraus = ceil(H / 0,18)). Cada
              uma pode usar as de cima.
            </p>
            {variables.length > 0 && (
              <ul className="border-line bg-surface divide-line-soft divide-y border">
                {variables.map((variable, index) => (
                  <li key={variable.id} className="grid gap-2 px-4 py-3">
                    {editable ? (
                      <>
                        <VariableForm
                          productId={product.id}
                          versionId={shown.id}
                          variableId={variable.id}
                          issues={issuesFor("variable", index)}
                          initial={{
                            name: variable.name,
                            expr: variable.expr,
                            label: variable.label?.pt ?? "",
                            showToCustomer: variable.showToCustomer,
                          }}
                        />
                        <div className="flex justify-end gap-1">
                          <form
                            action={moveFormulaItemAction.bind(
                              null,
                              product.id,
                              "variable",
                              variable.id,
                              -1,
                            )}
                          >
                            <Button type="submit" size="sm" variant="ghost" disabled={index === 0}>
                              Subir
                            </Button>
                          </form>
                          <form
                            action={moveFormulaItemAction.bind(
                              null,
                              product.id,
                              "variable",
                              variable.id,
                              1,
                            )}
                          >
                            <Button
                              type="submit"
                              size="sm"
                              variant="ghost"
                              disabled={index === variables.length - 1}
                            >
                              Descer
                            </Button>
                          </form>
                          <form
                            action={removeFormulaItemAction.bind(
                              null,
                              product.id,
                              "variable",
                              variable.id,
                            )}
                          >
                            <Button type="submit" size="sm" variant="ghost">
                              Apagar
                            </Button>
                          </form>
                        </div>
                      </>
                    ) : (
                      <p className="font-mono text-sm">
                        {variable.name} = {variable.expr}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {editable && (
              <div className="border-line bg-surface border px-4 py-3">
                <VariableForm
                  productId={product.id}
                  versionId={shown.id}
                  variableId={null}
                  issues={[]}
                  initial={{ name: "", expr: "", label: "", showToCustomer: false }}
                />
              </div>
            )}
          </div>

          <div className="grid gap-3">
            <h3 className="text-sm font-semibold">Linhas de custo</h3>
            {lines.length === 0 ? (
              <p className="text-steel text-sm">Ainda não há linhas.</p>
            ) : (
              <ol className="border-line bg-surface divide-line-soft divide-y border">
                {lines.map((row, index) => {
                  const lineIssues = issuesFor("line", index);
                  return (
                    <li key={row.line.id}>
                      <details className="group">
                        <summary className="hover:bg-canvas flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                          <span className="text-steel w-5 text-right tabular-nums">
                            {index + 1}
                          </span>
                          <span className="font-medium">{row.line.label}</span>
                          <span className="text-steel font-mono text-xs">
                            {row.line.quantityExpr} {row.line.unit}
                          </span>
                          {row.line.conditions.length > 0 && (
                            <span className="text-steel text-xs">condicionada</span>
                          )}
                          {lineIssues.length > 0 && (
                            <span className="text-error text-xs">
                              {lineIssues.length === 1
                                ? "1 problema"
                                : `${lineIssues.length} problemas`}
                            </span>
                          )}
                          {editable && (
                            <span className="text-brand ml-auto text-xs group-open:hidden">
                              Editar
                            </span>
                          )}
                        </summary>
                        {editable && (
                          <div className="grid gap-3 px-4 pt-1 pb-4">
                            <LineForm
                              productId={product.id}
                              versionId={shown.id}
                              lineId={row.line.id}
                              initial={lineValues(row)}
                              options={optionInfo}
                              choiceOptions={choiceOptions}
                              sources={sources}
                              issues={lineIssues}
                            />
                            <div className="flex justify-end gap-1">
                              <form
                                action={moveFormulaItemAction.bind(
                                  null,
                                  product.id,
                                  "line",
                                  row.line.id,
                                  -1,
                                )}
                              >
                                <Button
                                  type="submit"
                                  size="sm"
                                  variant="ghost"
                                  disabled={index === 0}
                                >
                                  Subir
                                </Button>
                              </form>
                              <form
                                action={moveFormulaItemAction.bind(
                                  null,
                                  product.id,
                                  "line",
                                  row.line.id,
                                  1,
                                )}
                              >
                                <Button
                                  type="submit"
                                  size="sm"
                                  variant="ghost"
                                  disabled={index === lines.length - 1}
                                >
                                  Descer
                                </Button>
                              </form>
                              <form
                                action={removeFormulaItemAction.bind(
                                  null,
                                  product.id,
                                  "line",
                                  row.line.id,
                                )}
                              >
                                <Button type="submit" size="sm" variant="ghost">
                                  Apagar linha
                                </Button>
                              </form>
                            </div>
                          </div>
                        )}
                      </details>
                    </li>
                  );
                })}
              </ol>
            )}
            {editable && (
              <details className="border-line bg-surface border">
                <summary className="text-brand cursor-pointer px-4 py-3 text-sm">
                  + Nova linha
                </summary>
                <div className="px-4 pb-4">
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
                  />
                </div>
              </details>
            )}
          </div>
        </section>
      )}

      {shown && optionInfo.length > 0 && (
        <section aria-labelledby="exemplo" className="grid gap-3">
          <div>
            <h2 id="exemplo" className="font-semibold">
              Preço de exemplo
            </h2>
            <p className="text-steel text-sm">
              Escolha valores como faria um cliente. Usa os custos e as margens de hoje; não grava
              nada.
            </p>
          </div>
          <PreviewPanel versionId={shown.id} options={optionInfo} />
        </section>
      )}
    </main>
  );
}
