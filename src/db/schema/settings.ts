import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Parâmetros de negócio editáveis no backoffice (margem do gateway, validade
 * dos orçamentos, custo/hora, taxa de IVA…). Nunca em constantes no código.
 */
export const settings = pgTable("settings", {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid().references(() => user.id, { onDelete: "set null" }),
});
