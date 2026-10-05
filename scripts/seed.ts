/**
 * Cria (ou promove) o primeiro admin a partir de SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD.
 * Idempotente: correr duas vezes não duplica nada nem altera a password existente.
 */
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { account, user } from "@/db/schema";
import { log } from "@/lib/log";
import { auth } from "@/server/auth/auth";

const seedEnv = z
  .object({
    SEED_ADMIN_EMAIL: z.email(),
    SEED_ADMIN_PASSWORD: z.string().min(10),
  })
  .parse(process.env);

async function seedAdmin() {
  const email = seedEnv.SEED_ADMIN_EMAIL.toLowerCase();
  const [existing] = await db.select().from(user).where(eq(user.email, email));

  if (existing) {
    if (existing.role !== "admin") {
      await db.update(user).set({ role: "admin" }).where(eq(user.id, existing.id));
      log.info("seed.admin.promoted", { userId: existing.id });
    } else {
      log.info("seed.admin.exists", { userId: existing.id });
    }
    return;
  }

  const ctx = await auth.$context;
  const passwordHash = await ctx.password.hash(seedEnv.SEED_ADMIN_PASSWORD);

  await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(user)
      .values({ name: "Administrador", email, emailVerified: true, role: "admin" })
      .returning({ id: user.id });
    if (!created) throw new Error("Falha ao criar o admin");

    // Conta de email/password no formato do Better Auth (providerId "credential").
    await tx.insert(account).values({
      accountId: created.id,
      providerId: "credential",
      userId: created.id,
      password: passwordHash,
    });
    log.info("seed.admin.created", { userId: created.id });
  });
}

seedAdmin()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    log.error("seed.failed", { error });
    process.exit(1);
  });
