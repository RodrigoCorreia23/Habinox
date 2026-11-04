import type { Metadata } from "next";
import { centsToEuroInput } from "@/lib/money";
import { fractionToPercent } from "@/lib/percent";
import { requireAdmin } from "@/server/auth/session";
import { listSectors } from "@/server/catalog/sectors";
import { ArchiveButton, SectorForm } from "./forms";

export const metadata: Metadata = { title: "Mão de obra · Habinox" };

export default async function LabourPage() {
  await requireAdmin("/admin/mao-de-obra");
  const [active, archived] = await Promise.all([listSectors(), listSectors({ archived: true })]);

  return (
    <main className="grid gap-8 px-4 py-6 md:px-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Mão de obra</h1>
        <p className="text-steel mt-1 max-w-3xl text-sm">
          Cada sector (serralharia, corte laser, instalação…) tem o seu custo por hora e a sua
          margem. As linhas de horas das fórmulas usam estes valores; mudar aqui muda o preço de
          todos os produtos que usam o sector.
        </p>
      </header>

      <section aria-labelledby="sectores" className="grid gap-3">
        <h2 id="sectores" className="sr-only">
          Sectores
        </h2>
        {active.length === 0 ? (
          <p className="text-steel border-line bg-surface border px-4 py-6 text-sm">
            Ainda não há sectores. Crie o primeiro abaixo, por exemplo “Serralharia”.
          </p>
        ) : (
          <ul className="border-line bg-surface divide-line-soft divide-y border">
            {active.map((sector) => (
              <li
                key={sector.id}
                className="flex flex-wrap items-end justify-between gap-3 px-4 py-3"
              >
                <SectorForm
                  id={sector.id}
                  initial={{
                    name: sector.name,
                    rate: centsToEuroInput(sector.hourlyRateCents),
                    margin: sector.margin === null ? "" : fractionToPercent(sector.margin),
                  }}
                />
                <div className="flex items-center gap-3">
                  {sector.margin === null && (
                    <span className="text-error text-xs">Margem por decidir</span>
                  )}
                  <ArchiveButton id={sector.id} archived={false} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="novo" className="grid gap-3">
        <h2 id="novo" className="font-semibold">
          Novo sector
        </h2>
        <div className="border-line bg-surface border px-4 py-3">
          <SectorForm id={null} initial={{ name: "", rate: "", margin: "" }} />
        </div>
      </section>

      {archived.length > 0 && (
        <section aria-labelledby="arquivados" className="grid max-w-2xl gap-3">
          <h2 id="arquivados" className="font-semibold">
            Arquivados
          </h2>
          <ul className="border-line bg-surface divide-line-soft divide-y border text-sm">
            {archived.map((sector) => (
              <li key={sector.id} className="flex items-center justify-between gap-4 px-4 py-2">
                <span className="text-steel">{sector.name}</span>
                <ArchiveButton id={sector.id} archived />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
