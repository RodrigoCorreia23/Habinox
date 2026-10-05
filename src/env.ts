import { z } from "zod";

/**
 * Variáveis de ambiente do servidor, validadas no arranque.
 * Se faltar alguma, a app falha logo em vez de rebentar a meio de um pedido.
 * Acrescentar aqui cada nova variável (e no .env.example).
 */
export const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    NEXT_PUBLIC_APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
    DATABASE_URL: z.url(),
    // Segredo enviado pela Vercel Cron no header Authorization. Gerar com: openssl rand -hex 32
    CRON_SECRET: z.string().min(32),
    // Better Auth: segredo para assinar sessões e URL pública da app.
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    // Email: sem RESEND_API_KEY os emails são escritos no log (só em development).
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(1).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NEXT_PUBLIC_APP_ENV !== "development" && !env.RESEND_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["RESEND_API_KEY"],
        message:
          "obrigatório fora de development (senão os links de verificação iriam para os logs)",
      });
    }
    if (env.RESEND_API_KEY && !env.EMAIL_FROM) {
      ctx.addIssue({
        code: "custom",
        path: ["EMAIL_FROM"],
        message: "obrigatório quando RESEND_API_KEY está definido",
      });
    }
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
