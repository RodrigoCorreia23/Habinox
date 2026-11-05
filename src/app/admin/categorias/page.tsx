import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, CornerDownRight, ImageOff } from "lucide-react";
import { type Column, DataTable } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/empty-state";
import { PageBody } from "@/components/admin/page-body";
import { PageHeader } from "@/components/admin/page-header";
import { ReorderButtons } from "@/components/admin/reorder-buttons";
import { CATEGORY_STATUS } from "@/components/admin/status";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { type Focus, objectPosition } from "@/lib/images";
import { requireAdmin } from "@/server/auth/session";
import {
  type CategoryProductCounts,
  type CategoryRow,
  listCategoryProductCounts,
  listCategoryTree,
} from "@/server/catalog/categories";
import { moveCategoryAction } from "./actions";
import { CategoryRowActions, RestoreCategoryButton } from "./forms";

export const metadata: Metadata = { title: "Categorias · Habinox" };

interface Row {
  category: CategoryRow;
  depth: 0 | 1;
  /** Produtos da própria categoria e, nas de topo, também das subcategorias (como na loja). */
  counts: CategoryProductCounts;
  up?: () => Promise<void>;
  down?: () => Promise<void>;
}

/** Miniatura de 40px, recortada à volta do foco, ou um quadrado vazio. */
function Thumb({ url, focus }: { url: string | null; focus: Focus | null }) {
  if (!url) {
    return (
      <span
        aria-hidden
        className="bg-surface-alt text-steel-light grid size-10 shrink-0 place-items-center rounded-[2px]"
      >
        <ImageOff className="size-4" strokeWidth={1.5} />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- miniatura de 40px, sem otimização
    <img
      src={url}
      alt=""
      loading="lazy"
      className="size-10 shrink-0 rounded-[2px] object-cover"
      style={{ objectPosition: objectPosition(focus) }}
    />
  );
}

function statusOf(row: Row) {
  if (row.counts.published === 0) return CATEGORY_STATUS["sem-produtos"];
  if (!row.category.imageUrl) return CATEGORY_STATUS["sem-imagem"];
  return CATEGORY_STATUS.visivel;
}

const STATUS_HINT: Record<string, string> = {
  "Sem produtos": "Não aparece na loja enquanto não tiver produtos publicados.",
  "Sem imagem": "Aparece na loja com um cartão sem fotografia.",
  Visível: "Aparece na loja.",
};

const columns: Column<Row>[] = [
  {
    key: "name",
    header: "Nome",
    primary: true,
    className: "w-1/2",
    cell: (row) => (
      <span className={`flex items-center gap-3 ${row.depth === 1 ? "pl-6" : ""}`}>
        {row.depth === 1 && (
          <CornerDownRight
            aria-hidden
            className="text-steel-light -ml-6 size-4"
            strokeWidth={1.5}
          />
        )}
        <Thumb url={row.category.imageUrl} focus={row.category.imageFocus} />
        <span className={row.depth === 0 ? "font-semibold" : "font-medium"}>
          {row.category.name.pt}
        </span>
      </span>
    ),
  },
  {
    key: "status",
    header: "Estado",
    mobile: "title",
    cell: (row) => {
      const status = statusOf(row);
      return (
        <StatusBadge tone={status.tone} title={STATUS_HINT[status.label]}>
          {status.label}
        </StatusBadge>
      );
    },
  },
  {
    key: "products",
    header: "Produtos na loja",
    align: "right",
    mobile: "meta",
    cell: (row) => {
      const { published, unpublished } = row.counts;
      return (
        <span className="inline-grid justify-items-end">
          {published > 0 ? (
            <Link
              href={`/admin/produtos?categoria=${row.category.id}`}
              className="link-admin tabular-nums"
              aria-label={`${published} ${published === 1 ? "produto" : "produtos"} na loja em ${row.category.name.pt}`}
            >
              {published}
              <span className="md:hidden"> na loja</span>
            </Link>
          ) : (
            <span className="text-steel-light tabular-nums">
              0<span className="md:hidden"> na loja</span>
            </span>
          )}
          {unpublished > 0 && (
            <span className="text-steel text-[13px]">+{unpublished} por publicar</span>
          )}
        </span>
      );
    },
  },
  {
    key: "order",
    header: <span className="sr-only">Ordem</span>,
    mobile: "aside",
    className: "w-0 whitespace-nowrap",
    cell: (row) => (
      <ReorderButtons itemLabel={row.category.name.pt} upAction={row.up} downAction={row.down} />
    ),
  },
  {
    key: "actions",
    header: <span className="sr-only">Ações</span>,
    align: "right",
    mobile: "aside",
    className: "w-0 whitespace-nowrap",
    cell: (row) => (
      <CategoryRowActions
        id={row.category.id}
        name={row.category.name.pt}
        isRoot={row.depth === 0}
      />
    ),
  },
];

export default async function CategoriesPage() {
  await requireAdmin("/admin/categorias");
  const [tree, all, counts] = await Promise.all([
    listCategoryTree(),
    listCategoryTree({ includeArchived: true }),
    listCategoryProductCounts(),
  ]);
  const archived = all
    .flatMap((root) => [root, ...root.children])
    .filter((category) => category.archivedAt);

  const own = (id: string) => counts.get(id) ?? { published: 0, unpublished: 0 };
  // As setas só existem onde há para onde mover (entre irmãs).
  const moves = (index: number, length: number, id: string) => ({
    up: index > 0 ? moveCategoryAction.bind(null, id, "up") : undefined,
    down: index < length - 1 ? moveCategoryAction.bind(null, id, "down") : undefined,
  });
  const rows: Row[] = tree.flatMap((root, rootIndex) => {
    const children = root.children.map((child, index) => ({
      category: child,
      depth: 1 as const,
      counts: own(child.id),
      ...moves(index, root.children.length, child.id),
    }));
    const total = children.reduce(
      (sum, child) => ({
        published: sum.published + child.counts.published,
        unpublished: sum.unpublished + child.counts.unpublished,
      }),
      own(root.id),
    );
    return [
      {
        category: root,
        depth: 0 as const,
        counts: total,
        ...moves(rootIndex, tree.length, root.id),
      },
      ...children,
    ];
  });

  return (
    <PageBody>
      <PageHeader
        title="Categorias"
        description="Como a loja arruma os produtos: categorias (Portões) e, dentro delas, subcategorias (Portões de correr)."
        help={
          <>
            <p>
              Há dois níveis. Um produto fica numa subcategoria ou numa categoria que não tenha
              subcategorias.
            </p>
            <p>
              Uma categoria só aparece na loja quando tem produtos publicados. A ordem desta lista é
              a ordem da loja: mude-a com as setas ↑↓.
            </p>
            <p>
              Arquivar tira a categoria da loja sem apagar nada; pode repô-la a qualquer momento.
            </p>
          </>
        }
        actions={
          <Button asChild>
            <Link href="/admin/categorias/nova">Nova categoria</Link>
          </Button>
        }
      />

      <div className="grid gap-12">
        <DataTable
          caption="Categorias da loja"
          columns={columns}
          rows={rows}
          rowKey={(row) => row.category.id}
          rowHref={(row) => `/admin/categorias/${row.category.id}`}
          empty={
            <EmptyState
              title="Ainda não há categorias"
              action={
                <Button asChild>
                  <Link href="/admin/categorias/nova">Criar a primeira categoria</Link>
                </Button>
              }
            >
              As categorias são as secções da loja. Comece por uma principal, por exemplo «Portões»,
              e depois acrescente-lhe subcategorias como «Portões de correr».
            </EmptyState>
          }
        />

        {archived.length > 0 && (
          <details className="group/arquivo">
            <summary className="text-ink focus-visible:ring-amber-ink inline-flex cursor-pointer list-none items-center gap-1.5 rounded-[2px] text-[15px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
              <ChevronRight
                aria-hidden
                className="size-4 transition-transform duration-150 group-open/arquivo:rotate-90"
                strokeWidth={1.75}
              />
              Arquivadas{" "}
              <span className="text-steel font-normal tabular-nums">{archived.length}</span>
            </summary>
            <div className="mt-3 grid gap-3">
              <p className="text-steel text-[13px]/[18px]">
                Não aparecem na loja; pode repô-las a qualquer momento.
              </p>
              <ul className="bg-surface border-line divide-line-soft divide-y rounded-[2px] border">
                {archived.map((category) => (
                  <li
                    key={category.id}
                    className="flex min-h-12 items-center justify-between gap-4 px-4 py-2 text-sm"
                  >
                    <Link
                      href={`/admin/categorias/${category.id}`}
                      className="text-ink-soft hover:underline hover:underline-offset-4"
                    >
                      {category.name.pt}
                    </Link>
                    <RestoreCategoryButton id={category.id} name={category.name.pt} />
                  </li>
                ))}
              </ul>
            </div>
          </details>
        )}
      </div>
    </PageBody>
  );
}
