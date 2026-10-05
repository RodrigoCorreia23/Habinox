import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// Localmente as credenciais vêm do .env.local; no CI/Vercel já estão no ambiente.
if (!process.env.DATABASE_URL && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  casing: "snake_case",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
  verbose: true,
});
