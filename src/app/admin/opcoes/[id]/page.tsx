import { addToProductAction } from "../actions";
import { ImportFromErp } from "./import-erp";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ChevronRight } from "lucide-react";
import { NextStep } from "@/components/admin/next-step";
import { Notice } from "@/components/admin/notice";
import { PageBody } from "@/components/admin/page-body";
import { PageHeader } from "@/components/admin/page-header";
import { Section } from "@/components/admin/section";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatEuros, parseDecimal, toCents } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/server/auth/session";
import { getProduct, listVersionOptions } from "@/server/catalog/products";
import {
  getOption,
  listArticlesForPicker,
  listErpFamilies,
  listOptionUsage,
  listValueUsage,
  OPTION_TYPES,
} from "@/server/catalog/options";
import type { OptionType } from "@/lib/options";
import {
  OptionArchiveZone,
  OptionEditor,
  RestoreOptionButton,
  RestoreValueButton,
  type ValueItem,
  ValueList,
} from "../forms";

export const metadata: Metadata = { title: "Opção · Habinox" };

/** «4,00 € / m»: o custo do ERP ao lado do nome, para escolher o material certo. */
function costHint(cost: string, unit: string) {
  try {
    return `${formatEuros(toCents(parseDecimal(cost)))} / ${unit}`;
  } catch {
    return unit;
  }
}

export default async function OptionPage({
  params,
  searchParams,
}: PageProps<"/admin/opcoes/[id]">) {
  await requireAdmin("/admin/opcoes");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [data, articles, optionUsage, valueUsage, families] = await Promise.all([
    getOption(id),
    listArticlesForPicker(),
    listOptionUsage(),
    listValueUsage(id),
    listErpFamilies(),
  ]);
  if (!data) notFound();
  // Veio do editor de um produto (criar opção nova): oferecer juntá-la a esse produto.
  const { produto } = await searchParams;
  const fromProduct =
    typeof produto === "string" && z.uuid().safeParse(produto).success
      ? await getProduct(produto)
      : null;
  const canAddToProduct =
    fromProduct?.working &&
    !(await listVersionOptions(fromProduct.working.id)).some(
      (row) => row.option.id === data.option.id,
    );
  const { option, values } = data;
  const usedIn = (optionUsage.get(option.id) ?? []).map((product) => product.name);
  const active = values.filter(({ value }) => !value.archivedAt);
  const archived = values.filter(({ value }) => value.archivedAt);
  const isChoice = option.type === "choice";

  const items: ValueItem[] = active.map(({ value, material }) => ({
    id: value.id,
    label: value.label.pt,
    key: value.key,
    position: value.position,
    params: value.params,
    ralCode: value.ralCode ?? "",
    swatchHex: value.swatchHex ?? "",
    materialId: value.materialId ?? "",
    materialName: material?.name ?? null,
    asksText: value.asksText,
    usedIn: (valueUsage.get(value.id) ?? []).map((product) => product.name),
  }));
  const materials = [
    { value: "", label: "Nenhum" },
    ...articles.map((article) => ({
      value: article.id,
      label: article.name,
      hint: costHint(article.cost, article.unit),
    })),
  ];

  return (
    <PageBody>
      <PageHeader
        crumbs={[{ href: "/admin/opcoes", label: "Opções" }]}
        title={option.name.pt}
        status={option.archivedAt ? <StatusBadge tone="quiet">Arquivada</StatusBadge> : undefined}
        meta={
          <>
            {OPTION_TYPES[option.type as OptionType]} ·{" "}
            {usedIn.length === 0 ? (
              "ainda não é usada em nenhum produto"
            ) : (
              <Link href={`/admin/produtos?opcao=${option.id}`} className="link-admin">
                usada em {usedIn.length} {usedIn.length === 1 ? "produto" : "produtos"}
              </Link>
            )}
          </>
        }
      />

      {/* Todas as secções da ficha acabam na mesma linha à direita (720px). */}
      <div className="grid max-w-[720px] gap-12">
        {option.archivedAt && (
          <Notice
            tone="info"
            title="Esta opção está arquivada"
            action={<RestoreOptionButton id={option.id} name={option.name.pt} />}
          >
            Não se pode acrescentar a produtos. Os produtos que já a usam continuam iguais.
          </Notice>
        )}

        <Section id="dados" title="Dados">
          <OptionEditor
            id={option.id}
            initial={{
              name: option.name.pt,
              key: option.key,
              type: option.type,
              unit: option.unit ?? "",
              display: option.display ?? "",
              helpText: option.helpText?.pt ?? "",
            }}
          />
        </Section>

        {canAddToProduct && fromProduct && (
          <Notice
            tone="info"
            title={`Para usar em «${fromProduct.product.name.pt}»`}
            action={
              <form action={addToProductAction.bind(null, data.option.id, fromProduct.product.id)}>
                <Button
                  type="submit"
                  disabled={isChoice && data.values.every(({ value }) => value.archivedAt)}
                >
                  Acrescentar a {fromProduct.product.name.pt}
                </Button>
              </form>
            }
          >
            {isChoice
              ? "Acrescente os valores (ou importe-os do Odoo) e depois junte a opção ao produto, com todos os valores."
              : "Junte a opção ao produto."}
          </Notice>
        )}

        {isChoice && (
          <Section
            id="valores"
            title="Valores"
            count={active.length}
            description="O que o cliente pode escolher. A ordem desta lista é a ordem na loja."
            actions={
              <ImportFromErp
                optionId={option.id}
                families={families.map((family) => ({
                  name: family.name,
                  articles: family.articles.map((article) => ({
                    ...article,
                    hasMargin: article.margin !== null,
                  })),
                }))}
                existingMaterialIds={values
                  .map(({ value }) => value.materialId)
                  .filter((materialId): materialId is string => Boolean(materialId))}
              />
            }
          >
            <div className="grid gap-6">
              <ValueList
                optionId={option.id}
                optionKey={option.key}
                values={items}
                swatches={option.display === "swatches"}
                materials={materials}
                nextPosition={(active.at(-1)?.value.position ?? -1) + 1}
              />

              {archived.length > 0 && (
                <details className="group/arquivo">
                  <summary className="text-ink focus-visible:ring-amber-ink inline-flex cursor-pointer list-none items-center gap-1.5 rounded-[2px] text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
                    <ChevronRight
                      aria-hidden
                      className="size-4 transition-transform duration-150 group-open/arquivo:rotate-90"
                      strokeWidth={1.75}
                    />
                    Valores arquivados{" "}
                    <span className="text-steel font-normal tabular-nums">{archived.length}</span>
                  </summary>
                  <div className="mt-3 grid gap-3">
                    <p className="text-steel text-[13px]/[18px]">
                      Não vêm na lista quando acrescenta esta opção a um produto; os produtos que já
                      os oferecem continuam iguais. Pode repô-los a qualquer momento.
                    </p>
                    <ul className="bg-surface border-line divide-line-soft divide-y rounded-[2px] border">
                      {archived.map(({ value }) => (
                        <li
                          key={value.id}
                          className="flex min-h-12 items-center justify-between gap-4 px-4 py-2 text-sm"
                        >
                          <span className="text-ink-soft">{value.label.pt}</span>
                          <RestoreValueButton id={value.id} label={value.label.pt} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              )}
            </div>
          </Section>
        )}

        {!option.archivedAt && usedIn.length === 0 && (!isChoice || active.length > 0) && (
          <NextStep href="/admin/produtos">Seguinte: acrescentá-la a um produto</NextStep>
        )}

        {!option.archivedAt && (
          <Section
            id="arquivar"
            title="Zona de perigo"
            description="Arquivar não apaga nada: a opção deixa de se poder acrescentar a produtos."
          >
            <div className="border-danger-line bg-surface rounded-[2px] border p-5">
              <OptionArchiveZone
                id={option.id}
                name={option.name.pt}
                archived={false}
                usedIn={usedIn}
              />
            </div>
          </Section>
        )}
      </div>
      {/* A barra «Tem alterações por guardar» dos dados da opção vem para aqui. */}
      <div id="barra-guardar" className="contents" />
    </PageBody>
  );
}
