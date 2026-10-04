import { z } from "zod";

/**
 * Variáveis de ambiente do servidor, validadas no arranque.
 * Se faltar alguma, a app falha logo em vez de rebentar a meio de um pedido.
 * Acrescentar aqui cada nova variável (e no .env.example).
 */
export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Variáveis de ambiente inválidas:\n${issues}`);
  }
  return result.data;
}

export const env = parseServerEnv(process.env);
