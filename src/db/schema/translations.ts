/**
 * Estado de cada tradução do catálogo: automática (feita pelo tradutor ao
 * guardar o português) ou revista (escrita ou corrigida à mão no backoffice),
 * e a impressão digital do português de onde saiu. Uma tradução revista nunca
 * é substituída pela automática; se o português mudar, fica marcada para rever.
 * O texto traduzido em si continua no `jsonb` por língua da própria tabela.
 */
import { check, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const translationStates = pgTable(
  "translation_states",
  {
    /** Campo traduzível (ex.: "category.name"; lista em server/catalog/translations.ts). */
    field: text().notNull(),
    rowId: uuid().notNull(),
    locale: text().notNull(),
    /** SHA-256 do português quando a tradução foi feita. */
    sourceHash: text().notNull(),
    origin: text().notNull(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.field, table.rowId, table.locale] }),
    check("translation_states_origin", sql`${table.origin} in ('auto', 'manual')`),
  ],
);
