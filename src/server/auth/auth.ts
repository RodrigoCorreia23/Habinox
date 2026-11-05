import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { env } from "@/env";
import { log } from "@/lib/log";
import { sendEmail } from "@/server/email/send";
import { resetPasswordMessage, verifyEmailMessage } from "@/server/email/templates";
import { readSignUpConsents, signUpConsentRows } from "./sign-up-consents";

export const auth = betterAuth({
  appName: "Habinox",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  advanced: {
    database: { generateId: "uuid" },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 10,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(resetPasswordMessage(user.email, url));
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail(verifyEmailMessage(user.email, url));
    },
  },
  user: {
    additionalFields: {
      // Nunca aceite do cliente (input: false). Contas Pro/admin são atribuídas no backoffice.
      role: { type: "string", required: true, defaultValue: "cliente", input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Registo pelo site: sem aceitar os termos não se cria a conta.
        before: async (_user, ctx) => {
          if (ctx?.path !== "/sign-up/email") return;
          if (!readSignUpConsents(ctx.body).terms) {
            throw new APIError("BAD_REQUEST", {
              code: "TERMS_REQUIRED",
              message: "Tem de aceitar os termos e a política de privacidade",
            });
          }
        },
        after: async (created, ctx) => {
          if (ctx?.path !== "/sign-up/email") return;
          await db
            .insert(schema.consents)
            .values(signUpConsentRows(created.id, readSignUpConsents(ctx.body)))
            .catch((error: unknown) =>
              log.error("auth.consents_failed", { userId: created.id, error }),
            );
        },
      },
    },
  },
  // Em serverless a memória não é partilhada entre instâncias: guardar contadores na BD.
  rateLimit: { storage: "database" },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
