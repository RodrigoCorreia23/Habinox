import type { Metadata } from "next";
import Link from "next/link";
import { fractionToPercent } from "@/lib/percent";
import { requireAdmin } from "@/server/auth/session";
import {
  countMaterials,
  lastSuccessfulSync,
  listMaterials,
  listSyncRuns,
  type MaterialRow,
} from "@/server/catalog/materials";
import { MarginForm, SyncNowButton } from "./forms";

export const metadata: Metadata = { title: "Materiais e custos · Habinox" };

const costFormat = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
  useGrouping: "always",
});
const dateTime = new Intl.DateTimeFormat("pt-PT", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Lisbon",
});

const RUN_STATUS: Record<string, string> = {
  running: "A correr",
  succeeded: "Correu bem",
  partial: "Com avisos",
  failed: "Falhou",
};

/** Variação desde o custo anterior, só para mostrar (float chega para 1 casa). */
function costChange(row: MaterialRow): string | null {
  if (!row.previousCost || Number(row.previousCost) === 0) return null;
  const percent = (Number(row.cost) / Number(row.previousCost) - 1) * 100;
  if (Math.abs(percent) < 0.05) return null;
  return `${percent > 0 ? "+" : ""}${percent.toLocaleString("pt-PT", { maximumFractionDigits: 1 })}%`;
}

export default async function MaterialsPage({ searchParams }: PageProps<"/admin/materiais">) {
  await requireAdmin("/admin/materiais");
  const attentionOnly = (await searchParams).atencao === "1";

  const [rows, counts, runs, lastSync] = await Promise.all([
    listMaterials({ attentionOnly }),
    countMaterials(),
    listSyncRuns(8),
    lastSuccessfulSync(),
  ]);
  const lastRun = runs[0];
  const failing = lastRun?.status === "failed";

  return (
    <main className="grid gap-8 px-4 py-6 md:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Materiais e custos</h1>
          <p className="text-steel mt-1 text-sm">
            {lastSync
              ? `Custos do ERP sincronizados a ${dateTime.format(lastSync)}.`
              : "Ainda não houve nenhuma sincronização com o ERP."}{" "}
            As margens são da loja: a sincronização nunca as altera.
          </p>
        </div>
        <SyncNowButton />
      </header>

      {failing && (
        <div role="alert" className="border-error bg-surface border-l-4 px-4 py-3 text-sm">
          <p className="font-semibold">A última sincronização com o ERP falhou</p>
          <p className="mt-1">
            {lastSync
              ? `A loja continua a calcular preços com os custos de ${dateTime.format(lastSync)}.`
              : "A loja ainda não tem custos."}{" "}
            Erro: {(lastRun.errors as { message?: string }[])[0]?.message ?? "desconhecido"}.
          </p>
        </div>
      )}

      <dl className="grid grid-cols-3 gap-px border-line bg-line max-w-2xl border">
        {[
          ["Artigos", counts.total],
          ["Margem por decidir", counts.noMargin],
          ["Desapareceram do ERP", counts.missing],
        ].map(([label, value]) => (
          <div key={label} className="bg-surface px-4 py-3">
            <dt className="text-steel text-xs">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="artigos" className="grid gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 id="artigos" className="font-semibold">
            Artigos do ERP
          </h2>
          <nav aria-label="Filtro" className="flex gap-1 text-sm">
            <Link
              href="/admin/materiais"
              aria-current={!attentionOnly ? "page" : undefined}
              className="aria-[current=page]:bg-ink rounded-[2px] px-2.5 py-1 aria-[current=page]:text-white"
            >
              Todos
            </Link>
            <Link
              href="/admin/materiais?atencao=1"
              aria-current={attentionOnly ? "page" : undefined}
              className="aria-[current=page]:bg-ink rounded-[2px] px-2.5 py-1 aria-[current=page]:text-white"
            >
              Precisam de atenção
            </Link>
          </nav>
        </div>

        {rows.length === 0 ? (
          <p className="text-steel border-line bg-surface border px-4 py-6 text-sm">
            {attentionOnly
              ? "Nenhum artigo precisa de atenção."
              : "Ainda não há artigos. Carregue em “Sincronizar agora” para os trazer do ERP."}
          </p>
        ) : (
          <div className="border-line bg-surface overflow-x-auto border">
            <table className="w-full text-sm">
              <thead className="text-steel border-line border-b text-left text-xs">
                <tr>
                  <th className="px-4 py-2 font-medium">Artigo</th>
                  <th className="px-4 py-2 text-right font-medium">Custo</th>
                  <th className="px-4 py-2 font-medium">Margem</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const change = costChange(row);
                  return (
                    <tr key={row.id} className="border-line-soft border-b last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">{row.name}</p>
                        <p className="text-steel text-xs">
                          {row.erpCode} · por {row.unit}
                          {row.weightPerUnit &&
                            ` · ${Number(row.weightPerUnit).toLocaleString("pt-PT")} kg/${row.unit}`}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <p>{costFormat.format(Number(row.cost))}</p>
                        <p className="text-steel text-xs">
                          {change ? `${change} · ` : ""}
                          {dateTime.format(row.costUpdatedAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <MarginForm
                          id={row.id}
                          name={row.name}
                          percent={row.margin === null ? "" : fractionToPercent(row.margin)}
                        />
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {row.erpMissingAt ? (
                          <span className="text-error">
                            Desapareceu do ERP a {dateTime.format(row.erpMissingAt)}. Mantém o
                            último custo.
                          </span>
                        ) : row.margin === null ? (
                          <span className="text-error">
                            Margem por decidir: os produtos que o usam não se publicam.
                          </span>
                        ) : (
                          <span className="text-steel">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="sincronizacoes" className="grid max-w-3xl gap-3">
        <h2 id="sincronizacoes" className="font-semibold">
          Sincronizações
        </h2>
        {runs.length === 0 ? (
          <p className="text-steel text-sm">Ainda nenhuma.</p>
        ) : (
          <div className="border-line bg-surface overflow-x-auto border">
            <table className="w-full text-sm">
              <thead className="text-steel border-line border-b text-left text-xs">
                <tr>
                  <th className="px-4 py-2 font-medium">Início</th>
                  <th className="px-4 py-2 font-medium">Origem</th>
                  <th className="px-4 py-2 text-right font-medium">Duração</th>
                  <th className="px-4 py-2 text-right font-medium">Alterações</th>
                  <th className="px-4 py-2 font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-line-soft border-b last:border-0">
                    <td className="px-4 py-2 tabular-nums">{dateTime.format(run.startedAt)}</td>
                    <td className="px-4 py-2">{run.source === "fake" ? "ERP de teste" : "Odoo"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {run.finishedAt
                        ? `${((run.finishedAt.getTime() - run.startedAt.getTime()) / 1000).toLocaleString("pt-PT", { maximumFractionDigits: 1 })} s`
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{run.items}</td>
                    <td className={`px-4 py-2 ${run.status === "failed" ? "text-error" : ""}`}>
                      {RUN_STATUS[run.status] ?? run.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
