/**
 * Erros e resultados da sincronização com o ERP em frases para o Bruno: o que
 * aconteceu e o que fazer. O texto técnico fica à parte («Detalhe para o suporte»).
 * Puro: sem BD nem I/O.
 */
import { formatDate, formatDateTime, formatTime } from "@/lib/format-date";
import vercelConfig from "../../../../vercel.json";

export type SyncError = { code?: string; message: string };

/** Frase para um erro conhecido; null quando não se reconhece (mostra-se uma genérica). */
function knownError(raw: string, lastSync: Date | null): string | null {
  const text = raw.toLowerCase();
  const since = lastSync
    ? `A loja continua com os custos de ${formatDateTime(lastSync)}.`
    : "A loja ainda não tem custos do ERP.";

  if (/\b(401|403)\b|unauthori[sz]ed|forbidden|token|credenc|acesso negado/.test(text)) {
    return "O ERP recusou o acesso: a chave expirou ou mudou. Avise o Rodrigo.";
  }
  if (
    /fetch failed|timeout|timed out|econn|enotfound|network|socket|aborted|não respondeu/.test(text)
  ) {
    return `O ERP não respondeu. ${since} Tente daqui a uns minutos.`;
  }
  if (/não configurado|not configured/.test(text)) {
    return `A ligação ao ERP ainda não está configurada neste ambiente. ${since} Avise o Rodrigo.`;
  }
  if (/já havia uma sincronização|already running/.test(text)) {
    return "Já estava uma sincronização a correr. Espere um minuto e veja o resultado.";
  }
  if (/não devolveu artigos válidos/.test(text)) {
    return "O ERP não devolveu nenhum artigo. Nada foi alterado nem marcado como desaparecido. Avise o Rodrigo.";
  }
  if (/referência repetida/.test(text)) {
    return "Há artigos com a mesma referência no ERP. Esses ficaram como estavam até se corrigir no ERP.";
  }
  if (/artigo inválido/.test(text)) {
    return "Alguns artigos do ERP vinham incompletos e foram ignorados. Os outros foram atualizados.";
  }
  return null;
}

/** Frase para o primeiro erro de uma sincronização que falhou. */
export function describeSyncFailure(errors: readonly SyncError[], lastSync: Date | null): string {
  const first = errors[0]?.message ?? "";
  return (
    knownError(first, lastSync) ??
    `A sincronização com o ERP não terminou. ${
      lastSync
        ? `A loja continua com os custos de ${formatDateTime(lastSync)}.`
        : "A loja ainda não tem custos do ERP."
    } Tente outra vez; se voltar a falhar, avise o Rodrigo.`
  );
}

/** Detalhe técnico, só para quem dá suporte (nunca a frase principal). */
export function technicalDetail(errors: readonly SyncError[]): string | null {
  if (errors.length === 0) return null;
  return errors
    .slice(0, 5)
    .map((error) => (error.code ? `${error.code}: ${error.message}` : error.message))
    .join("\n");
}

/** Resultado de uma sincronização terminada, numa frase («Correu bem: 2 artigos atualizados»). */
export function describeRunResult(run: {
  status: string;
  items: number;
  errors: readonly SyncError[];
  lastSync: Date | null;
}): string {
  const articles = (n: number) => (n === 1 ? "1 artigo" : `${n} artigos`);
  switch (run.status) {
    case "succeeded":
      return run.items === 0
        ? "Correu bem: nada mudou"
        : `Correu bem: ${articles(run.items)} ${run.items === 1 ? "atualizado" : "atualizados"}`;
    case "partial":
      return `Com avisos: ${articles(run.errors.length)} ${run.errors.length === 1 ? "ignorado" : "ignorados"}, ${articles(run.items)} ${run.items === 1 ? "atualizado" : "atualizados"}`;
    case "failed": {
      const first = run.errors[0]?.message ?? "";
      if (/já havia uma sincronização/i.test(first)) return "Não correu: já havia outra a decorrer";
      if (/\b(401|403)\b|unauthori[sz]ed|forbidden|token/i.test(first))
        return "Falhou: o ERP recusou o acesso";
      if (/não configurado/i.test(first)) return "Falhou: o ERP não está configurado";
      return "Falhou: o ERP não respondeu";
    }
    default:
      return "A decorrer";
  }
}

/** Resumo de um «Sincronizar agora» que correu, para o toast. */
export function describeSyncSummary(summary: {
  inserted: number;
  costChanges: number;
  missing: number;
  errors: number;
}): string {
  const parts: string[] = [];
  if (summary.costChanges > 0)
    parts.push(
      summary.costChanges === 1 ? "1 custo mudou" : `${summary.costChanges} custos mudaram`,
    );
  if (summary.inserted > 0)
    parts.push(
      summary.inserted === 1
        ? "1 artigo novo (falta a margem)"
        : `${summary.inserted} artigos novos (falta a margem)`,
    );
  if (summary.missing > 0)
    parts.push(
      summary.missing === 1
        ? "1 artigo deixou de existir no ERP"
        : `${summary.missing} artigos deixaram de existir no ERP`,
    );
  if (summary.errors > 0)
    parts.push(summary.errors === 1 ? "1 artigo ignorado" : `${summary.errors} artigos ignorados`);
  if (parts.length === 0) return "Sincronizado. Tudo igual: nenhum custo mudou.";
  return `Sincronizado: ${parts.join(", ")}.`;
}

/**
 * Próxima sincronização automática, lida do vercel.json (a mesma fonte que o cron).
 * Só se percebe o formato diário «M H * * *» (UTC); outro formato devolve null.
 */
export function nextAutomaticSync(now: Date = new Date()): Date | null {
  const cron = (vercelConfig as { crons?: { path: string; schedule: string }[] }).crons?.find(
    (entry) => entry.path.endsWith("/odoo-sync"),
  );
  const match = cron && /^(\d{1,2}) (\d{1,2}) \* \* \*$/.exec(cron.schedule.trim());
  if (!match) return null;
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      Number(match[2]),
      Number(match[1]),
    ),
  );
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

/** «hoje às 04:00», «amanhã às 04:00» ou a data completa (hora de Lisboa). */
export function formatUpcoming(date: Date, now: Date = new Date()): string {
  if (formatDate(date) === formatDate(now)) return `hoje às ${formatTime(date)}`;
  if (formatDate(date) === formatDate(new Date(now.getTime() + 86_400_000)))
    return `amanhã às ${formatTime(date)}`;
  return formatDateTime(date);
}
