import type { Metadata } from "next";
import Link from "next/link";
import { ImageOff, Plus } from "lucide-react";
import { type Column, DataTable } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/empty-state";
import { FilterTabs } from "@/components/admin/filter-tabs";
import { PageBody } from "@/components/admin/page-body";
import { PageHeader } from "@/components/admin/page-header";
import { SearchBox } from "@/components/admin/search-box";
import { PRODUCT_STATUS } from "@/components/admin/status";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { objectPosition } from "@/lib/images";
import { requireAdmin } from "@/server/auth/session";
import {
  listLeafCategories,
  listProducts,
  parseProductFilters,
  type ProductFilters,
  productFilterLabels,
} from "@/server/catalog/products";
import { CategoryFilter } from "./category-filter";

export const metadata: Metadata = { title: "Produtos · Habinox" };

type Row = Awaited<ReturnType<typeof listProducts>>[number];

/** A partir de quantos produtos aparece o filtro por categoria. */
const CATEGORY_FILTER_FROM = 10;

/** Endereço da lista com os filtros dados (os vazios saem da URL). */
function listHref(filters: ProductFilters) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) search.set(key, value);
  const query = search.toString();
  return query ? `/admin/produtos?${query}` : "/admin/produtos";
}

function Thumbnail({ row }: { row: Row }) {
  if (!row.imageUrl) {
    return (
      <span
        title="Sem imagem"
        className="bg-surface-alt text-steel-light flex size-10 shrink-0 items-center justify-center rounded-[2px]"
      >
        <ImageOff aria-hidden className="size-4" strokeWidth={1.75} />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- miniatura do R2, recortada pelo foco
    <img
      src={row.imageUrl}
      alt=""
      loading="lazy"
      className="border-line size-10 shrink-0 rounded-[2px] border object-cover"
      style={{ objectPosition: objectPosition(row.imageFocus) }}
    />
  );
}

export default async function ProductsPage({ searchParams }: PageProps<"/admin/produtos">) {
  await requireAdmin("/admin/produtos");
  const filters = parseProductFilters(await searchParams);

  const [rows, inScope, everything, categories, labels] = await Promise.all([
    listProducts(filters),
    listProducts({ ...filters, estado: undefined }),
    listProducts(),
    listLeafCategories(),
    productFilterLabels(filters),
  ]);

  // As contagens dos separadores seguem os outros filtros (pesquisa, categoria…).
  const countOf = (status: keyof typeof PRODUCT_STATUS) =>
    inScope.filter((row) => row.status === status).length;
  const withoutImage = inScope.filter((row) => !row.imageUrl && !row.archivedAt).length;
  const tab = (
    estado: ProductFilters["estado"],
    label: string,
    count: number,
    attention = false,
  ) => ({
    href: listHref({ ...filters, estado }),
    label,
    count,
    current: filters.estado === estado,
    attention,
  });

  const usage = labels.material
    ? `que usam o material «${labels.material}»`
    : labels.sector
      ? `que usam a secção «${labels.sector}»`
      : labels.option
        ? `que usam a opção «${labels.option}»`
        : null;
  const showCategorySelect = everything.length >= CATEGORY_FILTER_FROM;
  const filtered = Object.values(filters).some(Boolean);

  const columns: Column<Row>[] = [
    {
      key: "produto",
      header: "Produto",
      primary: true,
      cell: (row) => (
        <span className="inline-flex items-center gap-3">
          <Thumbnail row={row} />
          <span>{row.name.pt}</span>
        </span>
      ),
    },
    {
      key: "categoria",
      header: "Categoria",
      mobile: "meta",
      cell: (row) => <span className="text-steel">{row.category.pt}</span>,
    },
    {
      key: "imagem",
      header: <span className="sr-only">Imagem</span>,
      mobile: "meta",
      cell: (row) =>
        !row.imageUrl && !row.archivedAt ? (
          <span className="text-warn text-[13px]">Falta a imagem</span>
        ) : null,
    },
    {
      key: "estado",
      header: "Estado",
      align: "right",
      mobile: "aside",
      cell: (row) => {
        const status = PRODUCT_STATUS[row.status];
        return (
          <StatusBadge
            tone={status.tone}
            title={row.publishedVersion ? `Na loja: versão ${row.publishedVersion}` : undefined}
          >
            {status.label}
          </StatusBadge>
        );
      },
    },
  ];

  const newProduct = (
    <Button asChild>
      <Link href="/admin/produtos/novo">
        <Plus aria-hidden strokeWidth={1.75} />
        Novo produto
      </Link>
    </Button>
  );

  return (
    <PageBody>
      <PageHeader
        title="Produtos"
        description="Os produtos que os clientes configuram na loja. Clique num para mudar medidas, opções ou preço."
        actions={newProduct}
      />

      {everything.length === 0 ? (
        <EmptyState title="Ainda não há produtos" action={newProduct}>
          Antes do primeiro, convém ter a{" "}
          <Link href="/admin/categorias" className="link-admin">
            categoria
          </Link>
          , as{" "}
          <Link href="/admin/opcoes" className="link-admin">
            opções
          </Link>{" "}
          (medidas, material…) e a{" "}
          <Link href="/admin/mao-de-obra" className="link-admin">
            mão de obra
          </Link>{" "}
          criadas.
        </EmptyState>
      ) : (
        <div className="grid gap-5">
          <FilterTabs
            label="Estado dos produtos"
            groups={[
              {
                items: [
                  tab(undefined, "Todos", inScope.length),
                  tab("na-loja", PRODUCT_STATUS["na-loja"].label, countOf("na-loja")),
                  tab(
                    "alteracoes",
                    PRODUCT_STATUS.alteracoes.label,
                    countOf("alteracoes"),
                    countOf("alteracoes") > 0,
                  ),
                  tab(
                    "por-publicar",
                    PRODUCT_STATUS["por-publicar"].label,
                    countOf("por-publicar"),
                  ),
                  tab("sem-imagem", "Sem imagem", withoutImage, withoutImage > 0),
                  ...(countOf("arquivado") > 0
                    ? [tab("arquivado", "Arquivados", countOf("arquivado"))]
                    : []),
                ],
              },
            ]}
          />

          <div className="flex flex-wrap items-start gap-3 max-sm:[&>*]:w-full">
            <SearchBox
              placeholder="Procurar por nome ou categoria"
              defaultValue={filters.q}
              hidden={{ ...filters, q: undefined }}
              resultSummary={`${rows.length} ${rows.length === 1 ? "resultado" : "resultados"} para «${filters.q ?? ""}»`}
              clearHref={listHref({ ...filters, q: undefined })}
            />
            {showCategorySelect && (
              <CategoryFilter
                categories={categories}
                value={filters.categoria ?? ""}
                hrefFor={Object.fromEntries([
                  ["", listHref({ ...filters, categoria: undefined })],
                  ...categories.map((category) => [
                    category.id,
                    listHref({ ...filters, categoria: category.id }),
                  ]),
                ])}
              />
            )}
          </div>

          {(usage || (labels.category && !showCategorySelect)) && (
            <p className="text-steel flex flex-wrap items-center gap-x-3 text-[13px]" role="status">
              <span>
                A mostrar os produtos {usage ?? `da categoria «${labels.category}»`}
                {usage && labels.category ? `, na categoria «${labels.category}»` : ""}.
              </span>
              <Link
                href={listHref({
                  ...filters,
                  material: undefined,
                  seccao: undefined,
                  opcao: undefined,
                  categoria: undefined,
                })}
                className="link-admin"
              >
                Limpar
              </Link>
            </p>
          )}

          <DataTable
            caption="Produtos"
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            rowHref={(row) => `/admin/produtos/${row.id}`}
            summary={
              filtered && rows.length > 0
                ? `A mostrar ${rows.length} de ${everything.length} produtos`
                : undefined
            }
            empty={
              <EmptyState
                title={
                  filters.estado
                    ? `Nenhum produto em «${filters.estado === "sem-imagem" ? "Sem imagem" : PRODUCT_STATUS[filters.estado].label}».`
                    : "Nenhum produto com este filtro."
                }
                secondary={
                  <Link href="/admin/produtos" className="link-admin text-sm">
                    Ver todos
                  </Link>
                }
              />
            }
          />
        </div>
      )}
    </PageBody>
  );
}
