import type { Metadata } from "next";
import { Advanced } from "@/components/admin/help";
import { Notice } from "@/components/admin/notice";
import { PageBody } from "@/components/admin/page-body";
import { PageHeader } from "@/components/admin/page-header";
import { Section } from "@/components/admin/section";
import { centsToEuroInput, formatEuros } from "@/lib/money";
import { fractionToPercent } from "@/lib/percent";
import { requireAdmin } from "@/server/auth/session";
import { listSectors, listSectorUsage } from "@/server/catalog/sectors";
import {
  NewSectorButton,
  NewSectorProvider,
  RestoreSectorButton,
  SectorsTable,
  type SectorView,
} from "./forms";

export const metadata: Metadata = { title: "Mão de obra · Habinox" };

const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

export default async function LabourPage() {
  await requireAdmin("/admin/mao-de-obra");
  const [active, archived, usage] = await Promise.all([
    listSectors(),
    listSectors({ archived: true }),
    listSectorUsage(),
  ]);

  const sectors: SectorView[] = active.map((sector) => ({
    id: sector.id,
    name: sector.name,
    rate: centsToEuroInput(sector.hourlyRateCents),
    margin: sector.margin === null ? "" : fractionToPercent(sector.margin),
    usedBy: usage.get(sector.id) ?? [],
  }));
  const withoutMargin = sectors.filter((sector) => sector.margin === "");
  const blocked = new Set(withoutMargin.flatMap((sector) => sector.usedBy.map((p) => p.id))).size;

  return (
    <NewSectorProvider>
      <PageBody>
        <PageHeader
          title="Mão de obra"
          description="Quanto custa uma hora de trabalho de cada equipa. Os produtos usam estes valores para calcular o preço."
          actions={active.length > 0 ? <NewSectorButton /> : undefined}
          help={
            <>
              <p>
                Cada secção da oficina tem o seu custo por hora e a sua margem. As fórmulas dos
                produtos contam as horas de cada secção: mudar um valor aqui muda logo o preço de
                todos os produtos que a usam.
              </p>
              <p>
                Ex.: 23,50 €/h + 20 % = {formatEuros(2820)} por hora ao cliente. Os valores
                guardam-se ao sair do campo; Esc desfaz o que escreveu.
              </p>
            </>
          }
        />

        <div className="max-w-4xl space-y-12">
          {withoutMargin.length > 0 && (
            <Notice
              tone="warn"
              title={`Falta definir a margem de ${plural(withoutMargin.length, "secção", "secções")}`}
            >
              {blocked > 0
                ? `${plural(blocked, "produto não se pode", "produtos não se podem")} publicar até haver margem.`
                : "Sem margem, os produtos que a usem não se podem publicar."}
            </Notice>
          )}

          <Section id="seccoes" title="Secções da oficina" count={active.length || undefined}>
            <SectorsTable sectors={sectors} />
            {active.length > 0 && active.length < 3 && (
              <p className="text-steel mt-3 text-[13px]">
                Exemplos de outras secções: Corte laser, Pintura, Instalação em obra.
              </p>
            )}
          </Section>

          {archived.length > 0 && (
            <Advanced title={`Arquivadas (${archived.length})`}>
              <p className="text-steel mb-3 text-[13px]">
                Não aparecem nas fórmulas novas; os produtos que já as usam mantêm o preço. Pode
                repô-las a qualquer momento.
              </p>
              <ul className="divide-line-soft divide-y">
                {archived.map((sector) => (
                  <li
                    key={sector.id}
                    className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0"
                  >
                    <span className="text-ink-soft">
                      {sector.name}{" "}
                      <span className="text-steel tabular-nums">
                        · {centsToEuroInput(sector.hourlyRateCents)} €/h
                      </span>
                    </span>
                    <RestoreSectorButton id={sector.id} name={sector.name} />
                  </li>
                ))}
              </ul>
            </Advanced>
          )}
        </div>
      </PageBody>
    </NewSectorProvider>
  );
}
