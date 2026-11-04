import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/server/auth/session";
import { listOptions, OPTION_TYPES } from "@/server/catalog/options";
import type { OptionType } from "@/lib/options";
import { ArchiveOptionButton } from "./forms";

export const metadata: Metadata = { title: "Opções · Habinox" };

export default async function OptionsPage() {
  await requireAdmin("/admin/opcoes");
  const [active, archived] = await Promise.all([listOptions(), listOptions({ archived: true })]);

  return (
    <main className="grid gap-8 px-4 py-6 md:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Opções</h1>
          <p className="text-steel mt-1 max-w-3xl text-sm">
            As perguntas que se fazem ao cliente (largura, material, cor, motorização…), definidas
            uma vez e usadas em vários produtos. Cada produto escolhe depois que opções usa, com os
            seus limites e valores permitidos.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/opcoes/nova">Nova opção</Link>
        </Button>
      </header>

      {active.length === 0 ? (
        <p className="text-steel border-line bg-surface border px-4 py-6 text-sm">
          Ainda não há opções. Comece pelas medidas (Largura, Altura) e pelo Material.
        </p>
      ) : (
        <div className="border-line bg-surface overflow-x-auto border">
          <table className="w-full text-sm">
            <thead className="text-steel border-line border-b text-left text-xs">
              <tr>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Chave</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 text-right font-medium">Valores</th>
              </tr>
            </thead>
            <tbody>
              {active.map((option) => (
                <tr key={option.id} className="border-line-soft border-b last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/opcoes/${option.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {option.name.pt}
                    </Link>
                  </td>
                  <td className="text-steel px-4 py-3 font-mono text-xs">{option.key}</td>
                  <td className="px-4 py-3">{OPTION_TYPES[option.type as OptionType]}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {option.type === "choice" ? option.values : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {archived.length > 0 && (
        <section aria-labelledby="arquivadas" className="grid max-w-2xl gap-3">
          <h2 id="arquivadas" className="font-semibold">
            Arquivadas
          </h2>
          <ul className="border-line bg-surface divide-line-soft divide-y border text-sm">
            {archived.map((option) => (
              <li key={option.id} className="flex items-center justify-between gap-4 px-4 py-2">
                <span className="text-steel">{option.name.pt}</span>
                <ArchiveOptionButton id={option.id} archived />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
