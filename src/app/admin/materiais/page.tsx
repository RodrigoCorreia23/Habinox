import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "cn";
import { ArrowDownRight, ArrowUpRight, CircleCheck } from "lucide-react";
import { EmptyState } from "@/components/admin/empty-state";
import { FilterTabs } from "@/components/admin/filter-tabs";
import { RelativeTime } from "@/components/admin/format";
import { Advanced } from "@/components/admin/help";
import { Notice } from "@/components/admin/notice";
import { PageBody } from "@/components/admin/page-body";
import { PageHeader } from "@/components/admin/page-header";
import { Section } from "@/components/admin/section";
import { StatusBadge } from "@/components/admin/status-badge";
import { MATERIAL_STATUS, SYNC_STATUS } from "@/components/admin/status";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { fractionToPercent } from "@/lib/percent";
import { requireAdmin } from "@/server/auth/session";
import {
  countMaterials,
  lastSuccessfulSync,
  listMaterials,
  listMaterialUsage,
  listSyncRuns,
  type MaterialFilter,
  type MaterialRow,
  type ProductRef,
} from "@/server/catalog/materials";
import { MarginCells, SyncNowButton } from "./forms";
import { formatUnitCost } from "./margin-price";
import {
  describeRunResult,
  describeSyncFailure,
  formatUpcoming,
  nextAutomaticSync,
  type SyncError,
  technicalDetail,
} from "./sync-messages";

export const metadata: Metadata = { title: "Materiais e custos · Habinox" };

const PATH = "/admin/materiais";
const FILTERS: MaterialFilter[] = ["atencao", "sem-margem", "desaparecidos"];

/** Variação desde o custo anterior, só para mostrar (float chega para 1 casa). */
function costChange(row: MaterialRow) {
  if (!row.previousCost || Number(row.previousCost) === 0) return null;
  const percent = (Number(row.cost) / Number(row.previousCost) - 1) * 100;
  if (Math.abs(percent) < 0.05) return null;
  const text = Math.abs(percent).toLocaleString("pt-PT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return { up: percent > 0, text: `${percent > 0 ? "+" : "−"}${text} %` };
}

const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

/** «Portão de correr, Guarda inox e mais 2», com cada nome a ligar à ficha do produto. */
function ProductList({ products }: { products: ProductRef[] }) {
  const shown = products.slice(0, 3);
  return (
    <>
      {shown.map((product, index) => (
        <span key={product.id}>
          {index > 0 && (index === shown.length - 1 && products.length <= 3 ? " e " : ", ")}
          <Link href={`/admin/produtos/${product.id}`} className="link-admin">
            {product.name}
          </Link>
        </span>
      ))}
      {products.length > 3 && ` e mais ${products.length - 3}`}
    </>
  );
}

export default async function MaterialsPage({ searchParams }: PageProps<"/admin/materiais">) {
  await requireAdmin(PATH);
  const params = await searchParams;
  const rawFilter = typeof params.filtro === "string" ? params.filtro : undefined;
  // ?atencao=1 era o endereço antigo do filtro: continua a funcionar.
  const filter: MaterialFilter | undefined = FILTERS.includes(rawFilter as MaterialFilter)
    ? (rawFilter as MaterialFilter)
    : params.atencao === "1"
      ? "atencao"
      : undefined;

  const [rows, counts, runs, lastSync, usage] = await Promise.all([
    listMaterials({ filter }),
    countMaterials(),
    listSyncRuns(5),
    lastSuccessfulSync(),
    listMaterialUsage(),
  ]);
  const lastRun = runs[0];
  const lastErrors = (lastRun?.errors ?? []) as SyncError[];
  const failing = lastRun?.status === "failed";
  const next = nextAutomaticSync();
  const attention = counts.noMargin + counts.missing;

  // Produtos parados por artigos sem margem (cada produto uma vez).
  const withoutMargin =
    filter === "sem-margem" ? rows : await listMaterials({ filter: "sem-margem" });
  const blocked = [
    ...new Map(
      withoutMargin
        .flatMap((row) => usage.get(row.id) ?? [])
        .map((product) => [product.id, product]),
    ).values(),
  ];

  const tabs = [
    { href: PATH, label: "Todos", count: counts.total, current: !filter },
    ...(filter === "atencao"
      ? [
          {
            href: `${PATH}?filtro=atencao`,
            label: "Precisam de atenção",
            count: attention,
            current: true,
            attention: attention > 0,
          },
        ]
      : []),
    {
      href: `${PATH}?filtro=sem-margem`,
      label: "Falta margem",
      count: counts.noMargin,
      current: filter === "sem-margem",
      attention: counts.noMargin > 0,
    },
    {
      href: `${PATH}?filtro=desaparecidos`,
      label: "Deixaram de existir no ERP",
      count: counts.missing,
      current: filter === "desaparecidos",
      attention: counts.missing > 0,
    },
  ];

  return (
    <PageBody>
      <PageHeader
        title="Materiais e custos"
        description={
          lastSync ? (
            <>
              Custos do ERP atualizados <RelativeTime date={lastSync} />
              {next && <> · próxima sincronização automática {formatUpcoming(next)}</>}.
            </>
          ) : (
            "Ainda não houve nenhuma sincronização com o ERP."
          )
        }
        meta="As margens são da loja: a sincronização nunca as altera."
        actions={<SyncNowButton />}
      />

      <div className="space-y-12">
        {(failing || counts.noMargin > 0) && (
          <div className="space-y-3">
            {failing && (
              <Notice tone="danger" title="A última sincronização com o ERP falhou">
                <p>{describeSyncFailure(lastErrors, lastSync)}</p>
                {technicalDetail(lastErrors) && (
                  <Advanced title="Detalhe para o suporte" className="mt-2">
                    <p className="font-mono text-[13px] break-words whitespace-pre-wrap">
                      {technicalDetail(lastErrors)}
                    </p>
                    <p className="text-steel mt-2 text-[13px]">
                      Sincronização de {formatDateTime(lastRun.startedAt)} · {lastRun.id}
                    </p>
                  </Advanced>
                )}
              </Notice>
            )}
            {counts.noMargin > 0 && (
              <Notice
                tone="warn"
                title={`Falta definir a margem de ${plural(counts.noMargin, "artigo", "artigos")}`}
                action={
                  filter !== "sem-margem" ? (
                    <Link href={`${PATH}?filtro=sem-margem`} className="link-admin text-sm">
                      Ver {counts.noMargin === 1 ? "o artigo" : "os artigos"}
                    </Link>
                  ) : undefined
                }
              >
                {blocked.length > 0 ? (
                  <p>
                    {counts.noMargin === 1 ? "Bloqueia" : "Bloqueiam"}{" "}
                    {plural(blocked.length, "produto", "produtos")}, que não se{" "}
                    {blocked.length === 1 ? "pode" : "podem"} publicar:{" "}
                    <ProductList products={blocked} />.
                  </p>
                ) : (
                  <p>
                    Nenhum produto {counts.noMargin === 1 ? "o usa" : "os usa"} ainda. Sem margem,
                    um produto que {counts.noMargin === 1 ? "o use" : "os use"} não se pode
                    publicar.
                  </p>
                )}
              </Notice>
            )}
          </div>
        )}

        <Section
          id="artigos"
          title="Artigos do ERP"
          count={counts.total}
          description="Margem = quanto se soma ao custo do ERP. Ex.: 4,00 € + 30 % = 5,20 €. Guarda-se ao sair do campo; Esc desfaz."
        >
          {attention > 0 || filter ? (
            <FilterTabs label="Filtrar artigos" groups={[{ items: tabs }]} className="mb-4" />
          ) : (
            counts.total > 0 && (
              <p className="text-ok mb-4 flex items-center gap-2 text-sm">
                <CircleCheck aria-hidden className="size-4" strokeWidth={1.75} />
                Tudo em ordem: todos os artigos têm margem e existem no ERP.
              </p>
            )
          )}

          {rows.length === 0 ? (
            filter ? (
              <EmptyState
                title={
                  filter === "desaparecidos"
                    ? "Nenhum artigo deixou de existir no ERP."
                    : filter === "sem-margem"
                      ? "Todos os artigos têm margem."
                      : "Nenhum artigo precisa de atenção."
                }
                action={
                  <Link href={PATH} className="link-admin text-sm">
                    Ver todos
                  </Link>
                }
              />
            ) : (
              <EmptyState title="Ainda não há artigos.">
                Os artigos e os custos vêm do ERP. Carregue em «Sincronizar agora» para os trazer;
                depois, defina a margem de cada um.
              </EmptyState>
            )
          ) : (
            // Abaixo de xl (portátil pequeno, tablet, telemóvel) cada artigo é um bloco:
            // com a barra lateral, a tabela inteira só cabe a partir dos 1280 px.
            <div className="bg-surface border-line rounded-[2px] border xl:overflow-x-auto">
              <table className="w-full border-collapse text-sm max-xl:block">
                <caption className="sr-only">Artigos do ERP, com custo, margem e estado</caption>
                <thead className="max-xl:hidden">
                  <tr className="border-line border-b">
                    <th scope="col" className="text-steel h-10 px-4 text-left text-xs font-medium">
                      Artigo
                    </th>
                    <th scope="col" className="text-steel h-10 px-4 text-right text-xs font-medium">
                      Custo do ERP
                    </th>
                    <th scope="col" className="text-steel h-10 px-4 text-left text-xs font-medium">
                      Margem
                    </th>
                    <th scope="col" className="text-steel h-10 px-4 text-right text-xs font-medium">
                      Preço com margem
                    </th>
                    <th scope="col" className="text-steel h-10 px-4 text-left text-xs font-medium">
                      Usado em
                    </th>
                    <th
                      scope="col"
                      className="text-steel h-10 w-px px-4 text-left text-xs font-medium"
                    >
                      <span className="sr-only">Estado</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="max-xl:block">
                  {rows.map((row) => {
                    const change = costChange(row);
                    const used = usage.get(row.id) ?? [];
                    const status =
                      row.margin === null
                        ? MATERIAL_STATUS["sem-margem"]
                        : row.erpMissingAt
                          ? MATERIAL_STATUS.desaparecido
                          : null;
                    return (
                      <tr
                        key={row.id}
                        className="border-line-soft has-[[data-dirty]]:bg-surface-alt border-b transition-colors duration-150 last:border-b-0 max-xl:border-line max-xl:grid max-xl:grid-cols-[minmax(0,1fr)_auto] max-xl:gap-x-4 max-xl:gap-y-3 max-xl:p-4 md:max-xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(0,1fr)]"
                      >
                        <td className="px-4 py-3 align-middle max-xl:p-0 md:max-xl:col-span-2">
                          <p
                            className="text-ink font-medium"
                            title={
                              row.weightPerUnit
                                ? `${Number(row.weightPerUnit).toLocaleString("pt-PT")} kg por ${row.unit}`
                                : undefined
                            }
                          >
                            {row.name}
                          </p>
                          <p className="text-steel font-mono text-xs" title="Referência no ERP">
                            {row.erpCode}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right align-middle tabular-nums max-xl:row-start-2 max-xl:p-0 max-xl:text-left max-md:col-span-2 max-md:flex max-md:items-baseline max-md:justify-between max-md:gap-3">
                          <span className="text-steel text-[13px] md:max-xl:mb-1.5 md:max-xl:block xl:hidden">
                            Custo do ERP
                          </span>
                          <span className="text-right md:block md:max-xl:pt-2 md:max-xl:text-left">
                            <span className="whitespace-nowrap">
                              {formatUnitCost(row.cost)}{" "}
                              <span className="text-steel">/ {row.unit}</span>
                            </span>
                            {change && (
                              <span
                                title={`Antes ${formatUnitCost(row.previousCost!)}`}
                                className={cn(
                                  "flex items-center justify-end gap-0.5 text-xs whitespace-nowrap max-xl:mt-0.5 md:max-xl:justify-start md:max-xl:whitespace-normal",
                                  change.up ? "text-warn" : "text-steel",
                                )}
                              >
                                {change.up ? (
                                  <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={2} />
                                ) : (
                                  <ArrowDownRight
                                    aria-hidden
                                    className="size-3.5"
                                    strokeWidth={2}
                                  />
                                )}
                                {change.text} face ao custo anterior
                              </span>
                            )}
                            {row.erpMissingAt && (
                              <span className="text-steel block text-xs">
                                último custo, de {formatDate(row.costUpdatedAt)}
                              </span>
                            )}
                          </span>
                        </td>
                        <MarginCells
                          id={row.id}
                          name={row.name}
                          unit={row.unit}
                          cost={row.cost}
                          percent={row.margin === null ? "" : fractionToPercent(row.margin)}
                        />
                        <td className="px-4 py-3 align-middle whitespace-nowrap max-xl:p-0 max-md:col-span-2 max-md:flex max-md:justify-between">
                          <span className="text-steel text-[13px] md:max-xl:mb-1.5 md:max-xl:block xl:hidden">
                            Usado em
                          </span>
                          {used.length > 0 ? (
                            <Link
                              href={`/admin/produtos?material=${row.id}`}
                              className="link-admin md:max-xl:inline-block md:max-xl:pt-2"
                              title={used.map((product) => product.name).join(", ")}
                            >
                              {plural(used.length, "produto", "produtos")}
                            </Link>
                          ) : (
                            <span className="text-steel-light md:max-xl:inline-block md:max-xl:pt-2">
                              0 produtos
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-middle max-xl:row-start-1 max-xl:p-0 max-md:col-start-2 md:max-xl:col-span-2 md:max-xl:col-start-3 md:max-xl:text-right">
                          {status && (
                            <StatusBadge
                              tone={status.tone}
                              title={
                                row.erpMissingAt
                                  ? `Deixou de existir no ERP a ${formatDateTime(row.erpMissingAt)}. A loja mantém o último custo.`
                                  : "Os produtos que o usam não se podem publicar."
                              }
                            >
                              {status.label}
                            </StatusBadge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {runs.length > 0 && (
          <Advanced title="Últimas sincronizações">
            <ol className="divide-line-soft divide-y">
              {runs.map((run) => {
                const info =
                  SYNC_STATUS[run.status as keyof typeof SYNC_STATUS] ?? SYNC_STATUS.running;
                const seconds = run.finishedAt
                  ? (run.finishedAt.getTime() - run.startedAt.getTime()) / 1000
                  : null;
                return (
                  <li
                    key={run.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0"
                    title={`${seconds === null ? "A decorrer" : `Demorou ${seconds.toLocaleString("pt-PT", { maximumFractionDigits: 1 })} s`} · origem: ${run.source === "fake" ? "ERP de teste" : run.source}`}
                  >
                    <RelativeTime
                      date={run.startedAt}
                      className="text-ink-soft w-32 tabular-nums"
                    />
                    <StatusBadge tone={info.tone}>{info.label}</StatusBadge>
                    <span className="text-ink-soft min-w-0 flex-1">
                      {describeRunResult({
                        status: run.status,
                        items: run.items,
                        errors: run.errors as SyncError[],
                        lastSync,
                      })
                        .replace(/^[^:]+: /, "")
                        .replace(/^./, (letter) => letter.toUpperCase())}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Advanced>
        )}
      </div>
    </PageBody>
  );
}
