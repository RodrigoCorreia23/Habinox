import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { type Column, DataTable } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/empty-state";
import { PageBody } from "@/components/admin/page-body";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/server/auth/session";
import { listOptionSummaries, OPTION_TYPES } from "@/server/catalog/options";
import { RestoreOptionButton } from "./forms";

export const metadata: Metadata = { title: "Opções · Habinox" };

type Summary = Awaited<ReturnType<typeof listOptionSummaries>>[number];

/** O que o cliente responde, em poucas palavras: «mm», «Sim/não», «3: Ferro, Inox…». */
function ValuesSummary({ option }: { option: Summary }) {
  switch (option.type) {
    case "dimension":
      return <span className="text-ink-soft">em {option.unit ?? "mm"}</span>;
    case "number":
      return <span className="text-ink-soft">número</span>;
    case "boolean":
      return <span className="text-ink-soft">Sim/não</span>;
    default:
      if (option.values.length === 0) {
        return <span className="text-warn">Sem valores</span>;
      }
      return (
        <span
          className="text-ink-soft block max-w-[40ch] truncate"
          title={option.values.join(", ")}
        >
          <span className="tabular-nums">{option.values.length}</span>: {option.values.join(", ")}
        </span>
      );
  }
}

const columns: Column<Summary>[] = [
  {
    key: "name",
    header: "Nome",
    primary: true,
    className: "w-1/4",
    cell: (option) => option.name,
  },
  {
    key: "type",
    header: "Tipo",
    mobile: "title",
    cell: (option) => <span className="text-steel text-sm">{OPTION_TYPES[option.type]}</span>,
  },
  {
    key: "values",
    header: "O cliente responde",
    cell: (option) => <ValuesSummary option={option} />,
  },
  {
    key: "usedIn",
    header: "Usada em",
    align: "right",
    cell: (option) =>
      option.usedIn.length === 0 ? (
        <span className="text-steel-light">Nenhum produto</span>
      ) : (
        <Link
          href={`/admin/produtos?opcao=${option.id}`}
          className="link-admin whitespace-nowrap"
          title={option.usedIn.map((product) => product.name).join(", ")}
        >
          <span className="tabular-nums">{option.usedIn.length}</span>{" "}
          {option.usedIn.length === 1 ? "produto" : "produtos"}
        </Link>
      ),
  },
];

export default async function OptionsPage() {
  await requireAdmin("/admin/opcoes");
  const [active, archived] = await Promise.all([
    listOptionSummaries(),
    listOptionSummaries({ archived: true }),
  ]);

  return (
    <PageBody>
      <PageHeader
        title="Opções"
        description="As perguntas que se fazem ao cliente (largura, material, cor…), definidas uma vez e usadas em vários produtos."
        help={
          <>
            <p>
              Cada opção é criada aqui uma só vez. Depois, em cada produto, escolhe as opções que
              ele usa, com os seus limites (ex.: largura entre 1 000 e 6 000 mm) e os valores
              permitidos.
            </p>
            <p>
              Mudar o nome ou os valores aqui muda-os em todos os produtos. As regras da biblioteca
              (ex.: «se Material for Inox, a Cor só pode ser…») valem em todos os produtos que usem
              as opções envolvidas.
            </p>
          </>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/opcoes/regras">Regras da biblioteca</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/opcoes/nova">Nova opção</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-12">
        <DataTable
          caption="Opções da biblioteca"
          columns={columns}
          rows={active}
          rowKey={(option) => option.id}
          rowHref={(option) => `/admin/opcoes/${option.id}`}
          empty={
            <EmptyState
              title="Ainda não há opções"
              action={
                <Button asChild>
                  <Link href="/admin/opcoes/nova">Criar a primeira opção</Link>
                </Button>
              }
            >
              Comece pelas medidas (Largura, Altura) e pelo Material: quase todos os produtos as
              usam.
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
                Não se podem acrescentar a produtos; os que já as usam continuam iguais. Pode
                repô-las a qualquer momento.
              </p>
              <ul className="bg-surface border-line divide-line-soft divide-y rounded-[2px] border">
                {archived.map((option) => (
                  <li
                    key={option.id}
                    className="flex min-h-12 items-center justify-between gap-4 px-4 py-2 text-sm"
                  >
                    <Link
                      href={`/admin/opcoes/${option.id}`}
                      className="text-ink-soft hover:underline hover:underline-offset-4"
                    >
                      {option.name}
                      <span className="text-steel"> · {OPTION_TYPES[option.type]}</span>
                    </Link>
                    <RestoreOptionButton id={option.id} name={option.name} />
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
