import { asc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { sectors } from "@/db/schema";

export type SectorRow = typeof sectors.$inferSelect;

export async function listSectors({ archived = false } = {}): Promise<SectorRow[]> {
  return db
    .select()
    .from(sectors)
    .where(archived ? isNotNull(sectors.archivedAt) : isNull(sectors.archivedAt))
    .orderBy(asc(sectors.name));
}

export interface SectorInput {
  name: string;
  hourlyRateCents: number;
  /** Fração ("0.2000"); null = por decidir. */
  margin: string | null;
}

export async function createSector(input: SectorInput) {
  const [created] = await db.insert(sectors).values(input).returning({ id: sectors.id });
  return created!.id;
}

export async function updateSector(id: string, input: SectorInput) {
  const updated = await db
    .update(sectors)
    .set(input)
    .where(eq(sectors.id, id))
    .returning({ id: sectors.id });
  return updated.length === 1;
}

/** Arquivar: as fórmulas antigas continuam a apontar para o sector. */
export async function setSectorArchived(id: string, archived: boolean) {
  const updated = await db
    .update(sectors)
    .set({ archivedAt: archived ? new Date() : null })
    .where(eq(sectors.id, id))
    .returning({ id: sectors.id });
  return updated.length === 1;
}
