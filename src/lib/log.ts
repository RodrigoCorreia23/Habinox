/**
 * Logger estruturado mínimo: uma linha JSON por evento.
 * Na Vercel o stdout já é recolhido e pesquisável, por isso não há transporte.
 * Usar `log.child({ jobId })` / `log.child({ correlationId })` para contexto.
 */
type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

export interface Logger {
  debug(msg: string, fields?: Fields): void;
  info(msg: string, fields?: Fields): void;
  warn(msg: string, fields?: Fields): void;
  error(msg: string, fields?: Fields): void;
  child(fields: Fields): Logger;
}

function serializeError(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

function createLogger(base: Fields): Logger {
  const write = (level: Level, msg: string, fields: Fields = {}) => {
    const entry: Fields = { level, msg, time: new Date().toISOString(), ...base };
    for (const [key, value] of Object.entries(fields)) {
      entry[key] = serializeError(value);
    }
    const line = JSON.stringify(entry);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  };

  return {
    debug: (msg, fields) => write("debug", msg, fields),
    info: (msg, fields) => write("info", msg, fields),
    warn: (msg, fields) => write("warn", msg, fields),
    error: (msg, fields) => write("error", msg, fields),
    child: (fields) => createLogger({ ...base, ...fields }),
  };
}

export const log = createLogger({});
