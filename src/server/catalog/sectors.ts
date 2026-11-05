import { asc, eq, isNotNull, isNull, sql } from "drizzle-orm";
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

/**
 * Produtos (não arquivados) que usam cada secção da oficina nas linhas de horas,
 * na versão na loja ou na que está em preparação.
 */
export async function listSectorUsage(): Promise<Map<string, { id: string; name: string }[]>> {
  const rows = await db.execute<{
    sector_id: string;
    product_id: string;
    product_name: string;
  }>(sql`
    select distinct fl.sector_id, p.id as product_id, p.name->>'pt' as product_name
    from formula_lines fl
    join product_versions v on v.id = fl.product_version_id
    join products p on p.id = v.product_id
    where fl.sector_id is not null
      and p.archived_at is null
      and (v.id = p.published_version_id or v.status in ('draft', 'validated'))
    order by product_name
  `);
  const usage = new Map<string, { id: string; name: string }[]>();
  for (const row of rows) {
    const list = usage.get(row.sector_id) ?? [];
    list.push({ id: row.product_id, name: row.product_name });
    usage.set(row.sector_id, list);
  }
  return usage;
}
