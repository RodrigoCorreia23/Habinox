import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { formatParams } from "@/lib/options";
import { requireAdmin } from "@/server/auth/session";
import { getOption, listArticlesForPicker } from "@/server/catalog/options";
import { ArchiveOptionButton, ArchiveValueButton, OptionForm, ValueForm } from "../forms";

export const metadata: Metadata = { title: "Opção · Habinox" };

export default async function OptionPage({ params }: PageProps<"/admin/opcoes/[id]">) {
  await requireAdmin("/admin/opcoes");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [data, articles] = await Promise.all([getOption(id), listArticlesForPicker()]);
  if (!data) notFound();
  const { option, values } = data;
  const active = values.filter(({ value }) => !value.archivedAt);
  const archived = values.filter(({ value }) => value.archivedAt);
  const swatches = option.display === "swatches";

  return (
    <main className="grid gap-8 px-4 py-6 md:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-steel text-sm">
            <Link href="/admin/opcoes" className="underline-offset-4 hover:underline">
              Opções
            </Link>
          </p>
          <h1 className="text-xl font-semibold tracking-tight">{option.name.pt}</h1>
          {option.archivedAt && <p className="text-error mt-1 text-sm">Arquivada</p>}
        </div>
        <ArchiveOptionButton id={option.id} archived={Boolean(option.archivedAt)} />
      </header>

      <OptionForm
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

      {option.type === "choice" && (
        <section aria-labelledby="valores" className="grid gap-3">
          <h2 id="valores" className="font-semibold">
            Valores
          </h2>
          {active.length === 0 ? (
            <p className="text-steel text-sm">
              Ainda não há valores. Acrescente o primeiro abaixo.
            </p>
          ) : (
            <ul className="border-line bg-surface divide-line-soft divide-y border">
              {active.map(({ value, material }) => (
                <li key={value.id}>
                  <details className="group">
                    <summary className="hover:bg-canvas flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                      {value.swatchHex && (
                        <span
                          aria-hidden
                          className="border-line size-4 rounded-[2px] border"
                          style={{ backgroundColor: value.swatchHex }}
                        />
                      )}
                      <span className="font-medium">{value.label.pt}</span>
                      <span className="text-steel font-mono text-xs">{value.key}</span>
                      {Object.keys(value.params).length > 0 && (
                        <span className="text-steel font-mono text-xs">
                          {formatParams(value.params)}
                        </span>
                      )}
                      {material && (
                        <span className="text-steel text-xs">
                          + {material.name} ({material.erpCode})
                        </span>
                      )}
                      <span className="text-brand ml-auto text-xs group-open:hidden">Editar</span>
                      <span className="text-steel ml-auto hidden text-xs group-open:inline">
                        Fechar
                      </span>
                    </summary>
                    <div className="grid gap-2 px-4 pt-1 pb-4">
                      <ValueForm
                        optionId={option.id}
                        valueId={value.id}
                        swatches={swatches}
                        articles={articles}
                        initial={{
                          label: value.label.pt,
                          key: value.key,
                          position: value.position,
                          params: formatParams(value.params),
                          ralCode: value.ralCode ?? "",
                          swatchHex: value.swatchHex ?? "",
                          materialId: value.materialId ?? "",
                          asksText: value.asksText,
                        }}
                      />
                      <div className="flex justify-end">
                        <ArchiveValueButton id={value.id} archived={false} />
                      </div>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}

          <h3 className="mt-4 text-sm font-semibold">Novo valor</h3>
          <div className="border-line bg-surface border px-4 py-4">
            <ValueForm
              optionId={option.id}
              valueId={null}
              swatches={swatches}
              articles={articles}
              initial={{
                label: "",
                key: "",
                position: (active.at(-1)?.value.position ?? -1) + 1,
                params: "",
                ralCode: "",
                swatchHex: "",
                materialId: "",
                asksText: false,
              }}
            />
          </div>

          {archived.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-semibold">Valores arquivados</h3>
              <ul className="border-line bg-surface divide-line-soft divide-y border text-sm">
                {archived.map(({ value }) => (
                  <li key={value.id} className="flex items-center justify-between gap-4 px-4 py-2">
                    <span className="text-steel">{value.label.pt}</span>
                    <ArchiveValueButton id={value.id} archived />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </main>
  );
}
