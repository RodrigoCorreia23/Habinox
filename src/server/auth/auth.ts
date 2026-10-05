import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { env } from "@/env";
import { sendEmail } from "@/server/email/send";
import { resetPasswordMessage, verifyEmailMessage } from "@/server/email/templates";

export const auth = betterAuth({
  appName: "Abinox",
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
  // Em serverless a memória não é partilhada entre instâncias: guardar contadores na BD.
  rateLimit: { storage: "database" },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
