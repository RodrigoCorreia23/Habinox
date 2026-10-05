import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "./schema";

function createClient() {
  // prepare: false — necessário com o pooler da Neon (PgBouncer em modo transação).
  const sql = postgres(env.DATABASE_URL, { max: 10, prepare: false });
  return drizzle(sql, { schema, casing: "snake_case" });
}

export type Database = ReturnType<typeof createClient>;

// Em dev, o hot reload recarrega módulos: reutilizar a ligação evita esgotar conexões.
const globalForDb = globalThis as unknown as { db?: Database };

export const db = globalForDb.db ?? createClient();

if (env.NODE_ENV !== "production") {
  globalForDb.db = db;
}
