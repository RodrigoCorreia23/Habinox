import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/admin/empty-state";
import { FilterTabs } from "@/components/admin/filter-tabs";
import { PageBody } from "@/components/admin/page-body";
import { PageHeader } from "@/components/admin/page-header";
import { SearchBox } from "@/components/admin/search-box";
import { Section } from "@/components/admin/section";
import { TRANSLATION_STATUS } from "@/components/admin/status";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { routing } from "@/i18n/routing";
import type { ContentLocale } from "@/lib/localized";
import type { TranslationStatus } from "@/lib/translation-plan";
import { requireAdmin } from "@/server/auth/session";
import {
  listTranslationObjects,
  TARGET_LOCALES,
  type TranslationObject,
  type TranslationObjectKind,
} from "@/server/catalog/translations";
import { ObjectGroup } from "./object-group";
import { TranslateNow } from "./translate-now";
import { TranslationForm } from "./translation-form";

export const metadata: Metadata = { title: "Traduções · Habinox" };

type TargetLocale = Exclude<ContentLocale, "pt">;

/** Nome de cada língua em português (o Bruno lê «Inglês», não «English»). */
const LANGUAGE_NAMES: Record<TargetLocale, string> = {
  en: "Inglês",
  es: "Espanhol",
  fr: "Francês",
  de: "Alemão",
  nl: "Neerlandês",
  it: "Italiano",
};

/** Estado de cada tradução → chave do mapa único de estados (status.ts). */
const STATUS_KEY = {
  missing: "missing",
  auto: "machine",
  manual: "reviewed",
  stale: "stale",
} as const satisfies Record<TranslationStatus, keyof typeof TRANSLATION_STATUS>;

/** Precisa de alguém: falta a tradução ou o português mudou depois de revista. */
const needsAttention = (status: TranslationStatus) => status === "missing" || status === "stale";

const SECTIONS: { title: string; description: string; kinds: TranslationObjectKind[] }[] = [
  {
    title: "Produtos",
    description: "Nome, descrição, mensagens das regras e valores mostrados ao cliente.",
    kinds: ["product"],
  },
  { title: "Categorias", description: "Nome e descrição de cada categoria.", kinds: ["category"] },
  {
    title: "Opções",
    description: "Nome, texto de ajuda e valores de cada opção.",
    kinds: ["option", "library"],
  },
];

/** Para pesquisar sem ligar a maiúsculas nem acentos («portao» encontra «Portão»). */
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default async function TranslationsPage({ searchParams }: PageProps<"/admin/traducoes">) {
  await requireAdmin("/admin/traducoes");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const attentionOnly = params.falta === "1";

  // As línguas abertas na loja primeiro; as outras continuam a poder ser revistas
  // antes de abrirem (é assim que se aprova uma língua nova).
  const enabled = routing.locales as readonly string[];
  const open = TARGET_LOCALES.filter((l) => enabled.includes(l));
  const closed = TARGET_LOCALES.filter((l) => !enabled.includes(l));
  const locale: TargetLocale = TARGET_LOCALES.find((l) => l === params.lingua) ?? open[0] ?? "en";
  const languageName = LANGUAGE_NAMES[locale];
  const languageLower = languageName.toLowerCase();

  const objects = await listTranslationObjects(locale);
  const all = objects.flatMap((object) => object.rows);
  const counts = {
    total: all.length,
    reviewed: all.filter((row) => row.status === "manual").length,
    auto: all.filter((row) => row.status === "auto").length,
    missing: all.filter((row) => row.status === "missing").length,
    stale: all.filter((row) => row.status === "stale").length,
  };
  const attention = counts.missing + counts.stale;

  const href = (next: { lingua?: string; falta?: boolean; q?: string }) => {
    const search = new URLSearchParams({ lingua: next.lingua ?? locale });
    if (next.falta ?? attentionOnly) search.set("falta", "1");
    const term = next.q ?? q;
    if (term) search.set("q", term);
    return `/admin/traducoes?${search}`;
  };
  const languageTab = (l: TargetLocale) => ({
    href: href({ lingua: l }),
    label: LANGUAGE_NAMES[l],
    current: l === locale,
  });

  // Filtros: pesquisa (no português e no nome do produto/categoria/opção) e «precisam de atenção».
  const needle = fold(q);
  const visible: TranslationObject[] = objects
    .map((object) => {
      const objectMatches = needle !== "" && fold(object.name).includes(needle);
      return {
        ...object,
        rows: object.rows.filter(
          (row) =>
            (!attentionOnly || needsAttention(row.status)) &&
            (needle === "" || objectMatches || fold(row.pt).includes(needle)),
        ),
      };
    })
    .filter((object) => object.rows.length > 0);
  const visibleRows = visible.reduce((sum, object) => sum + object.rows.length, 0);
  // Mudar de língua ou de filtro volta a abrir os grupos com trabalho.
  const listKey = `${locale}|${attentionOnly}|${q}`;

  return (
    <PageBody>
      <PageHeader
        title="Traduções"
        description="As traduções são feitas automaticamente; aqui pode corrigi-las."
        actions={<TranslateNow />}
        help={
          <>
            <p>
              O catálogo escreve-se em português. Sempre que guarda um nome ou uma descrição, as
              outras línguas são traduzidas automaticamente em poucos segundos. Se alguma ficar por
              traduzir, carregue em «Traduzir o que falta».
            </p>
            <p>
              Uma tradução que corrigir aqui fica «Revista» e a tradução automática nunca a
              substitui. Cada campo guarda sozinho quando sai dele (ou com Ctrl+Enter). Se uma
              tradução automática já estiver boa, carregue em «Aceitar».
            </p>
            <p>
              Se mudar o português de um texto revisto, aparece «O português mudou»: confirme que a
              tradução continua certa ou reponha a automática.
            </p>
            <p>
              Os botões, menus e emails da loja já estão traduzidos; aqui só aparecem os textos que
              escreve no catálogo.
            </p>
          </>
        }
      />

      <div className="border-line flex flex-wrap items-end gap-x-8 border-b">
        <FilterTabs
          label="Língua"
          className="border-b-0"
          groups={[
            { label: closed.length ? "Na loja" : undefined, items: open.map(languageTab) },
            ...(closed.length
              ? [{ label: "Ainda não abertas na loja", items: closed.map(languageTab) }]
              : []),
          ]}
        />
        <FilterTabs
          label="Mostrar"
          className="border-b-0"
          groups={[
            {
              items: [
                {
                  href: href({ falta: false }),
                  label: "Todos",
                  count: counts.total,
                  current: !attentionOnly,
                },
                {
                  href: href({ falta: true }),
                  label: "Precisam de atenção",
                  count: attention,
                  current: attentionOnly,
                  attention: attention > 0,
                },
              ],
            },
          ]}
        />
      </div>

      <div className="mt-5 mb-10 flex flex-col-reverse gap-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-steel text-sm sm:pt-2.5">
          <span className="text-ink font-medium tabular-nums">
            {counts.reviewed} de {counts.total}
          </span>{" "}
          {counts.total === 1 ? "tradução revista" : "traduções revistas"} em {languageLower}
          {counts.auto > 0 && <> · {plural(counts.auto, "automática", "automáticas")}</>}
          {counts.missing > 0 && <> · {counts.missing} por traduzir</>}
          {counts.stale > 0 && (
            <>
              {" · "}
              <span className="text-warn font-medium">{counts.stale} com o português mudado</span>
            </>
          )}
        </p>
        <SearchBox
          defaultValue={q}
          placeholder="Procurar texto ou produto"
          label="Procurar nas traduções"
          hidden={{ lingua: locale, falta: attentionOnly ? "1" : undefined }}
          resultSummary={
            q ? plural(visibleRows, "texto encontrado", "textos encontrados") : undefined
          }
          clearHref={href({ q: "" })}
        />
      </div>

      {counts.total === 0 ? (
        <EmptyState
          title="Ainda não há textos para traduzir."
          action={
            <Button asChild variant="outline">
              <Link href="/admin/categorias/nova">Criar categoria</Link>
            </Button>
          }
          secondary={
            <Link href="/admin/produtos/novo" className="link-admin text-sm">
              Criar produto
            </Link>
          }
        >
          Os nomes e descrições aparecem aqui assim que criar categorias, opções e produtos.
        </EmptyState>
      ) : visible.length === 0 ? (
        q ? (
          <EmptyState
            title={`Nenhum texto com «${q}».`}
            secondary={
              <Link href={href({ q: "" })} className="link-admin text-sm">
                Limpar a pesquisa
              </Link>
            }
          >
            A pesquisa procura no texto em português e no nome do produto, categoria ou opção.
          </EmptyState>
        ) : (
          <EmptyState
            title={`Não falta nada em ${languageLower}.`}
            secondary={
              <Link href={href({ falta: false })} className="link-admin text-sm">
                Ver todas
              </Link>
            }
          >
            Todos os textos têm tradução e nenhum português mudou depois de revisto.
          </EmptyState>
        )
      ) : (
        <div className="space-y-12">
          {SECTIONS.map((section) => {
            const list = visible.filter((object) => section.kinds.includes(object.kind));
            if (list.length === 0) return null;
            return (
              <Section
                key={section.title}
                title={section.title}
                count={list.length}
                description={section.description}
              >
                <div className="border-line bg-surface divide-line divide-y rounded-[2px] border">
                  {list.map((object) => (
                    <TranslationGroup
                      key={`${object.kind}|${object.id}|${listKey}`}
                      object={object}
                      locale={locale}
                      languageName={languageName}
                      forceOpen={q !== ""}
                    />
                  ))}
                </div>
              </Section>
            );
          })}
        </div>
      )}
    </PageBody>
  );
}

function TranslationGroup({
  object,
  locale,
  languageName,
  forceOpen,
}: {
  object: TranslationObject;
  locale: TargetLocale;
  languageName: string;
  forceOpen: boolean;
}) {
  const missing = object.rows.filter((row) => row.status === "missing").length;
  const stale = object.rows.filter((row) => row.status === "stale").length;
  const machine = object.rows.filter((row) => row.status === "auto").length;
  let meta: React.ReactNode;
  if (object.kind === "option") {
    meta =
      object.usedIn.length > 0 ? (
        `Usada em: ${object.usedIn.join(", ")}`
      ) : (
        <span className="text-steel-light">Ainda não é usada em nenhum produto</span>
      );
  } else if (object.kind === "library") {
    meta = "Valem para todos os produtos que usam estas opções";
  }

  return (
    <ObjectGroup
      name={object.name}
      meta={meta}
      localeName={languageName}
      defaultOpen={forceOpen || missing + stale > 0}
      summary={
        missing + stale === 0 ? (
          machine > 0 ? (
            <span className="text-steel">{plural(machine, "automática", "automáticas")}</span>
          ) : (
            <span className="text-steel-light">Tudo revisto</span>
          )
        ) : (
          <>
            {missing > 0 && <span className="text-steel">faltam {missing}</span>}
            {missing > 0 && stale > 0 && <span className="text-steel"> · </span>}
            {stale > 0 && <span className="text-warn font-medium">{stale} a rever</span>}
          </>
        )
      }
    >
      {object.rows.map((row) => {
        const status = TRANSLATION_STATUS[STATUS_KEY[row.status]];
        return (
          <li
            key={`${row.field}|${row.id}`}
            className="grid gap-x-6 gap-y-3 px-4 py-4 md:grid-cols-2"
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-steel text-xs">{row.rowLabel}</p>
                <p lang="pt" className="text-ink mt-0.5 text-sm break-words whitespace-pre-line">
                  {row.pt}
                </p>
              </div>
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            </div>
            <TranslationForm
              field={row.field}
              id={row.id}
              locale={locale}
              localeName={languageName}
              rowLabel={row.rowLabel}
              pt={row.pt}
              initial={row.value ?? ""}
              multiline={row.multiline}
              status={row.status}
            />
          </li>
        );
      })}
    </ObjectGroup>
  );
}
