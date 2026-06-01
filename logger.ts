type LogArg = unknown;

function fmt(level: string, obj: LogArg, msg?: string): void {
  const ts = new Date().toISOString();
  const message = msg ?? (typeof obj === "string" ? obj : "");
  const extra =
    obj && typeof obj === "object" && Object.keys(obj as object).length > 0
      ? " " + JSON.stringify(obj)
      : "";
  // eslint-disable-next-line no-console
  console.log(`[${ts}] ${level.toUpperCase().padEnd(5)} ${message}${extra}`);
}

export const logger = {
  info:  (obj: LogArg, msg?: string) => fmt("info",  obj, msg),
  warn:  (obj: LogArg, msg?: string) => fmt("warn",  obj, msg),
  error: (obj: LogArg, msg?: string) => fmt("error", obj, msg),
  debug: (obj: LogArg, msg?: string) => fmt("debug", obj, msg),
  trace: (obj: LogArg, msg?: string) => fmt("trace", obj, msg),
  fatal: (obj: LogArg, msg?: string) => fmt("fatal", obj, msg),
  child: (_bindings: object) => logger,
};
