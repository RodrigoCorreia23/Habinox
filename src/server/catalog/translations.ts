/**
 * Traduções do catálogo: todos os textos que o cliente vê e que o Bruno escreve
 * em português no backoffice (nomes, descrições, opções, valores, mensagens de
 * regras e variáveis mostradas ao cliente). Cada texto é um `jsonb` por língua
 * (lib/localized); aqui só se lê e grava a entrada de uma língua, nunca o `pt`.
 *
 * Só os textos em uso: nada arquivado e, nas versões de produto, a publicada e
 * as que estão em preparação (as antigas já não aparecem a ninguém).
 */
import { sql } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db/client";
import { translationStates } from "@/db/schema";
import { CONTENT_LOCALES, type ContentLocale } from "@/lib/localized";
import { type Logger, log as rootLog } from "@/lib/log";
import {
  type PlanRow,
  type PlanState,
  planTranslations,
  sourceHash,
  translationStatus,
  type TranslationStatus,
} from "@/lib/translation-plan";
import { getTranslator, type TranslationItem } from "@/server/translation";

type Executor = Pick<typeof db, "execute">;

/** Línguas para onde se traduz (o português é a origem). */
export const TARGET_LOCALES = CONTENT_LOCALES.filter((locale) => locale !== "pt");

/** A que coisa do catálogo pertence cada texto (as traduções agrupam-se por ela). */
export type TranslationObjectKind = "product" | "category" | "option" | "library";

export type TranslatableField = {
  key: string;
  /** Produto, categoria ou opção dona do texto (as regras sem produto são da biblioteca). */
  object: Exclude<TranslationObjectKind, "library">;
  /** Nome da linha dentro do grupo, em palavras do Bruno («Nome», «Valor»…). */
  rowLabel: string;
  group: string;
  label: string;
  multiline: boolean;
  table: string;
  column: string;
  /**
   * SQL que devolve (id, context, pt, value, sort) para a língua `$1`, mais o objeto
   * dono do texto (obj_id, obj_name, obj_sort; obj_id null = regra da biblioteca).
   */
  query: (locale: string) => ReturnType<typeof sql>;
};

/** Versões que ainda contam: a publicada de cada produto e as que estão em preparação. */
const LIVE_VERSIONS = sql`(
  select pv.id from product_versions pv join products p on p.id = pv.product_id
  where p.archived_at is null and (pv.id = p.published_version_id or pv.status in ('draft', 'validated'))
)`;

export const TRANSLATABLE_FIELDS: TranslatableField[] = [
  {
    key: "category.name",
    object: "category",
    rowLabel: "Nome",
    group: "Categorias",
    label: "Nome",
    multiline: false,
    table: "categories",
    column: "name",
    query: (l) =>
      sql`select id, null as context, name->>'pt' as pt, name->>${l} as value, position as sort,
                 id as obj_id, name->>'pt' as obj_name, position as obj_sort
          from categories where archived_at is null`,
  },
  {
    key: "category.description",
    object: "category",
    rowLabel: "Descrição",
    group: "Categorias",
    label: "Descrição",
    multiline: true,
    table: "categories",
    column: "description",
    query: (l) =>
      sql`select id, name->>'pt' as context, description->>'pt' as pt, description->>${l} as value, position as sort,
                 id as obj_id, name->>'pt' as obj_name, position as obj_sort
          from categories where archived_at is null and description->>'pt' is not null`,
  },
  {
    key: "product.name",
    object: "product",
    rowLabel: "Nome",
    group: "Produtos",
    label: "Nome",
    multiline: false,
    table: "products",
    column: "name",
    query: (l) =>
      sql`select id, null as context, name->>'pt' as pt, name->>${l} as value, 0 as sort,
                 id as obj_id, name->>'pt' as obj_name, 0 as obj_sort
          from products where archived_at is null`,
  },
  {
    key: "product.description",
    object: "product",
    rowLabel: "Descrição",
    group: "Produtos",
    label: "Descrição",
    multiline: true,
    table: "products",
    column: "description",
    query: (l) =>
      sql`select id, name->>'pt' as context, description->>'pt' as pt, description->>${l} as value, 0 as sort,
                 id as obj_id, name->>'pt' as obj_name, 0 as obj_sort
          from products where archived_at is null and description->>'pt' is not null`,
  },
  {
    key: "option.name",
    object: "option",
    rowLabel: "Nome",
    group: "Opções",
    label: "Nome",
    multiline: false,
    table: "option_definitions",
    column: "name",
    query: (l) =>
      sql`select id, key as context, name->>'pt' as pt, name->>${l} as value, 0 as sort,
                 id as obj_id, name->>'pt' as obj_name, 0 as obj_sort
          from option_definitions where archived_at is null`,
  },
  {
    key: "option.helpText",
    object: "option",
    rowLabel: "Texto de ajuda",
    group: "Opções",
    label: "Ajuda",
    multiline: true,
    table: "option_definitions",
    column: "help_text",
    query: (l) =>
      sql`select id, name->>'pt' as context, help_text->>'pt' as pt, help_text->>${l} as value, 0 as sort,
                 id as obj_id, name->>'pt' as obj_name, 0 as obj_sort
          from option_definitions where archived_at is null and help_text->>'pt' is not null`,
  },
  {
    key: "optionValue.label",
    object: "option",
    rowLabel: "Valor",
    group: "Valores das opções",
    label: "Valor",
    multiline: false,
    table: "option_values",
    column: "label",
    query: (l) =>
      sql`select v.id, d.name->>'pt' as context, v.label->>'pt' as pt, v.label->>${l} as value, v.position as sort,
                 d.id as obj_id, d.name->>'pt' as obj_name, 0 as obj_sort
          from option_values v join option_definitions d on d.id = v.option_id
          where v.archived_at is null and d.archived_at is null`,
  },
  {
    key: "rule.message",
    object: "product",
    rowLabel: "Mensagem de uma regra",
    group: "Mensagens das regras",
    label: "Mensagem",
    multiline: true,
    table: "option_rules",
    column: "message",
    query: (l) =>
      sql`select r.id, coalesce(p.name->>'pt', 'Biblioteca de opções') as context, r.message->>'pt' as pt,
                 r.message->>${l} as value, r.position as sort,
                 p.id as obj_id, p.name->>'pt' as obj_name, 0 as obj_sort
          from option_rules r
          left join product_versions pv on pv.id = r.product_version_id
          left join products p on p.id = pv.product_id
          where r.message->>'pt' is not null
            and (r.product_version_id is null or r.product_version_id in ${LIVE_VERSIONS})`,
  },
  {
    key: "variable.label",
    object: "product",
    rowLabel: "Valor mostrado ao cliente",
    group: "Valores mostrados ao cliente",
    label: "Etiqueta",
    multiline: false,
    table: "formula_variables",
    column: "label",
    query: (l) =>
      sql`select f.id, p.name->>'pt' as context, f.label->>'pt' as pt, f.label->>${l} as value, f.position as sort,
                 p.id as obj_id, p.name->>'pt' as obj_name, 0 as obj_sort
          from formula_variables f
          join product_versions pv on pv.id = f.product_version_id
          join products p on p.id = pv.product_id
          where f.show_to_customer and f.label->>'pt' is not null
            and f.product_version_id in ${LIVE_VERSIONS}`,
  },
];

export interface TranslationRow {
  field: string;
  id: string;
  context: string | null;
  pt: string;
  value: string | null;
  status: TranslationStatus;
  objectId: string | null;
  objectName: string | null;
  objectSort: number;
}

async function readStates(): Promise<PlanState[]> {
  const rows = await db.select().from(translationStates);
  return rows.map((row) => ({ ...row, origin: row.origin as PlanState["origin"] }));
}

export async function listTranslations(locale: ContentLocale) {
  const states = new Map(
    (await readStates())
      .filter((state) => state.locale === locale)
      .map((state) => [`${state.field}|${state.rowId}`, state]),
  );
  const groups = await Promise.all(
    TRANSLATABLE_FIELDS.map(async (field) => {
      const result = await db.execute<{
        id: string;
        context: string | null;
        pt: string;
        value: string | null;
        sort: number;
        obj_id: string | null;
        obj_name: string | null;
        obj_sort: number;
      }>(sql`${field.query(locale)} order by 5, 3`);
      return {
        field,
        rows: [...result].map((row): TranslationRow => ({
          field: field.key,
          id: row.id,
          context: row.context,
          pt: row.pt,
          value: row.value,
          status: translationStatus(row.pt, row.value, states.get(`${field.key}|${row.id}`)),
          objectId: row.obj_id,
          objectName: row.obj_name,
          objectSort: Number(row.obj_sort) || 0,
        })),
      };
    }),
  );
  return groups;
}

export type TranslationObjectRow = TranslationRow & {
  rowLabel: string;
  multiline: boolean;
};

/** Um produto, uma categoria, uma opção (ou a biblioteca de regras) com os seus textos. */
export interface TranslationObject {
  kind: TranslationObjectKind;
  id: string;
  name: string;
  sort: number;
  /** Só nas opções: os produtos (na loja ou em preparação) que a usam. */
  usedIn: string[];
  rows: TranslationObjectRow[];
}

const LIBRARY_ID = "biblioteca";

/**
 * Os textos de uma língua agrupados pela coisa a que pertencem: cada produto com
 * o nome, a descrição, as mensagens das regras e os valores mostrados ao cliente;
 * cada opção com o nome, a ajuda e os valores; cada categoria com nome e descrição.
 */
export async function listTranslationObjects(locale: ContentLocale): Promise<TranslationObject[]> {
  const [groups, usage] = await Promise.all([
    listTranslations(locale),
    db.execute<{ option_id: string; name: string }>(
      sql`select distinct po.option_id, p.name->>'pt' as name
          from product_options po
          join product_versions pv on pv.id = po.product_version_id
          join products p on p.id = pv.product_id
          where po.product_version_id in ${LIVE_VERSIONS}
          order by 2`,
    ),
  ]);
  const usedIn = new Map<string, string[]>();
  for (const row of usage) {
    usedIn.set(row.option_id, [...(usedIn.get(row.option_id) ?? []), row.name]);
  }

  const objects = new Map<string, TranslationObject>();
  for (const { field, rows } of groups) {
    for (const row of rows) {
      const kind: TranslationObjectKind = row.objectId ? field.object : "library";
      const id = row.objectId ?? LIBRARY_ID;
      const key = `${kind}|${id}`;
      const object = objects.get(key) ?? {
        kind,
        id,
        name: row.objectName ?? "Regras da biblioteca",
        sort: row.objectSort,
        usedIn: kind === "option" ? (usedIn.get(id) ?? []) : [],
        rows: [],
      };
      object.rows.push({
        ...row,
        rowLabel: kind === "library" ? "Mensagem" : field.rowLabel,
        multiline: field.multiline,
      });
      objects.set(key, object);
    }
  }
  return [...objects.values()].sort(
    (a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "pt"),
  );
}

export function findField(key: string): TranslatableField | undefined {
  return TRANSLATABLE_FIELDS.find((field) => field.key === key);
}

/**
 * Grava a tradução de uma língua (texto vazio apaga-a; o português nunca se
 * toca aqui). Devolve false se a linha não existir.
 */
export async function setTranslation(
  field: TranslatableField,
  id: string,
  locale: Exclude<ContentLocale, "pt">,
  text: string,
  executor: Executor = db,
): Promise<boolean> {
  const table = sql.identifier(field.table);
  const column = sql.identifier(field.column);
  const result = await executor.execute(
    text === ""
      ? sql`update ${table} set ${column} = ${column} - ${locale}::text
            where id = ${id} and ${column} is not null returning id`
      : sql`update ${table} set ${column} = ${column} || jsonb_build_object(${locale}::text, ${text}::text)
            where id = ${id} and ${column} is not null returning id`,
  );
  return [...result].length > 0;
}

async function currentPortuguese(field: TranslatableField, id: string): Promise<string | null> {
  const column = sql.identifier(field.column);
  const result = await db.execute<{ pt: string | null }>(
    sql`select ${column}->>'pt' as pt from ${sql.identifier(field.table)} where id = ${id}`,
  );
  return [...result][0]?.pt ?? null;
}

/**
 * Tradução escrita ou corrigida à mão: fica "revista" e o automático nunca a
 * substitui. Texto vazio apaga-a e devolve-a ao automático (volta a ser traduzida).
 */
export async function saveManualTranslation(
  field: TranslatableField,
  id: string,
  locale: Exclude<ContentLocale, "pt">,
  text: string,
): Promise<boolean> {
  const pt = await currentPortuguese(field, id);
  if (pt === null) return false;
  if (!(await setTranslation(field, id, locale, text))) return false;
  const key = { field: field.key, rowId: id, locale };
  if (text === "") {
    await db
      .delete(translationStates)
      .where(
        sql`${translationStates.field} = ${key.field} and ${translationStates.rowId} = ${id} and ${translationStates.locale} = ${locale}`,
      );
  } else {
    await db
      .insert(translationStates)
      .values({ ...key, sourceHash: sourceHash(pt), origin: "manual" })
      .onConflictDoUpdate({
        target: [translationStates.field, translationStates.rowId, translationStates.locale],
        set: { sourceHash: sourceHash(pt), origin: "manual", updatedAt: new Date() },
      });
  }
  return true;
}

/** Todos os textos com as traduções de todas as línguas (para o plano). */
async function readPlanRows(): Promise<{ rows: PlanRow[]; context: Map<string, TranslationItem> }> {
  const perLocale = await Promise.all(
    TARGET_LOCALES.map(async (locale) => ({ locale, groups: await listTranslations(locale) })),
  );
  const rows = new Map<string, PlanRow>();
  const context = new Map<string, TranslationItem>();
  for (const { locale, groups } of perLocale) {
    for (const { field, rows: list } of groups) {
      for (const row of list) {
        const key = `${field.key}|${row.id}`;
        const entry = rows.get(key) ?? { field: field.key, id: row.id, pt: row.pt, values: {} };
        entry.values[locale] = row.value;
        rows.set(key, entry);
        context.set(key, {
          id: key,
          text: row.pt,
          kind: `${field.group} · ${field.label}`,
          context: row.context,
        });
      }
    }
  }
  return { rows: [...rows.values()], context };
}

const BATCH_SIZE = 25;
/** Por execução: o resto fica para a seguinte (o pedido não pode demorar demasiado). */
const MAX_ITEMS_PER_RUN = 150;

export interface TranslateSummary {
  translated: number;
  adopted: number;
  pending: number;
  failed: number;
  translator: string | null;
}

/**
 * Traduz automaticamente o que falta ou ficou desatualizado (idempotente: correr
 * duas vezes não traduz nada de novo). Um só de cada vez: se já houver uma
 * execução a correr, esta não faz nada.
 */
export async function translatePending(log: Logger = rootLog): Promise<TranslateSummary> {
  const translator = getTranslator();
  const summary: TranslateSummary = {
    translated: 0,
    adopted: 0,
    pending: 0,
    failed: 0,
    translator: translator?.source ?? null,
  };
  if (!translator) {
    log.warn("translations.no_translator");
    return summary;
  }

  return db.transaction(async (tx) => {
    const [lock] = [
      ...(await tx.execute<{ ok: boolean }>(
        sql`select pg_try_advisory_xact_lock(hashtext('catalog-translations')) as ok`,
      )),
    ];
    if (!lock?.ok) return summary;

    const [{ rows, context }, states] = await Promise.all([readPlanRows(), readStates()]);
    const plan = planTranslations(rows, states, TARGET_LOCALES);

    for (const item of plan.adopt) {
      await tx
        .insert(translationStates)
        .values({
          field: item.field,
          rowId: item.id,
          locale: item.locale,
          sourceHash: item.hash,
          origin: "manual",
        })
        .onConflictDoNothing();
      summary.adopted++;
    }

    const work = plan.translate.slice(0, MAX_ITEMS_PER_RUN);
    summary.pending = plan.translate.length - work.length;
    for (let i = 0; i < work.length; i += BATCH_SIZE) {
      const batch = work.slice(i, i + BATCH_SIZE);
      const locales = [...new Set(batch.flatMap((item) => item.locales))];
      let result;
      try {
        result = await translator.translate(
          batch.map((item) => context.get(`${item.field}|${item.id}`)!),
          locales,
        );
      } catch (error) {
        summary.failed += batch.length;
        log.error("translations.batch_failed", { size: batch.length, error });
        continue;
      }
      for (const item of batch) {
        const field = findField(item.field);
        const texts = result[`${item.field}|${item.id}`];
        if (!field || !texts) {
          summary.failed++;
          continue;
        }
        const hash = sourceHash(item.pt);
        for (const locale of item.locales) {
          const text = texts[locale];
          if (!text) continue;
          // Uma revisão à mão feita entretanto ganha sempre.
          const [manual] = [
            ...(await tx.execute<{ origin: string }>(
              sql`select origin from translation_states
                  where field = ${item.field} and row_id = ${item.id} and locale = ${locale} and origin = 'manual'`,
            )),
          ];
          if (manual) continue;
          await setTranslation(field, item.id, locale as Exclude<ContentLocale, "pt">, text, tx);
          await tx
            .insert(translationStates)
            .values({ field: item.field, rowId: item.id, locale, sourceHash: hash, origin: "auto" })
            .onConflictDoUpdate({
              target: [translationStates.field, translationStates.rowId, translationStates.locale],
              set: { sourceHash: hash, origin: "auto", updatedAt: new Date() },
            });
        }
        summary.translated++;
      }
    }
    log.info("translations.run", { ...summary });
    return summary;
  });
}

/**
 * Depois de guardar texto do catálogo: traduz em segundo plano, depois de a
 * resposta seguir (o Bruno não fica à espera). Uma falha só fica no log.
 */
export function translateInBackground() {
  after(async () => {
    await translatePending().catch((error: unknown) =>
      rootLog.error("translations.background_failed", { error }),
    );
  });
}
