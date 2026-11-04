import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import type { OptionType } from "@/lib/options";
import { requireAdmin } from "@/server/auth/session";
import { listOptions, OPTION_TYPES } from "@/server/catalog/options";
import { getProduct, listLeafCategories, listVersionOptions } from "@/server/catalog/products";
import { createDraftAction, moveOptionAction, removeOptionAction } from "../actions";
import { AddOptionForm, ProductForm, ProductOptionForm } from "../forms";

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

  const [categories, versionOptions, library] = await Promise.all([
    listLeafCategories(),
    shown ? listVersionOptions(shown.id) : Promise.resolve([]),
    listOptions(),
  ]);
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
    </main>
  );
}
