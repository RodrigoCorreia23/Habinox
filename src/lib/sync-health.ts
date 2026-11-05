/**
 * Saúde da cópia local dos custos do ERP, para o painel do backoffice.
 * A loja continua a vender com os últimos custos conhecidos; isto só diz ao
 * Bruno quando esses custos estão a ficar velhos.
 */
export type SyncHealth = { level: "ok" | "warn" | "critical"; message: string };

const HOUR = 3_600_000;

export function syncHealth(input: {
  lastRunStatus: string | null;
  lastSuccessAt: Date | null;
  now: Date;
  /** A sincronização corre 1x/dia: mais de 36 h sem sucesso já falhou pelo menos uma. */
  maxAgeHours?: number;
}): SyncHealth {
  const { lastRunStatus, lastSuccessAt, now, maxAgeHours = 36 } = input;
  if (!lastSuccessAt) {
    return lastRunStatus === "failed"
      ? {
          level: "critical",
          message: "A sincronização com o ERP nunca correu bem: a loja não tem custos.",
        }
      : { level: "warn", message: "Ainda não houve nenhuma sincronização com o ERP." };
  }
  const hours = Math.floor((now.getTime() - lastSuccessAt.getTime()) / HOUR);
  if (hours >= maxAgeHours) {
    return {
      level: "critical",
      message: `Os custos do ERP não são atualizados há ${hours} h. A loja continua com os últimos valores.`,
    };
  }
  if (lastRunStatus === "failed") {
    return {
      level: "warn",
      message:
        "A última sincronização falhou; a anterior correu bem e os custos ainda são recentes.",
    };
  }
  if (lastRunStatus === "partial") {
    return { level: "warn", message: "A última sincronização ignorou alguns artigos inválidos." };
  }
  return { level: "ok", message: "Custos do ERP atualizados." };
}
