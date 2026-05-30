import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
const isDiscloud = !!process.env["DISCLOUD"];

// On Discloud, esbuild-plugin-pino bakes absolute Replit paths into the bundle
// which break at runtime. Use a simple console-based logger instead.
function makeConsoleLogger() {
  const fmt = (level: string, obj: unknown, msg?: string) => {
    const extra = obj && typeof obj === "object" && Object.keys(obj as object).length ? JSON.stringify(obj) : "";
    console.log(`[${new Date().toISOString()}] ${level.toUpperCase()} ${msg ?? ""}${extra ? " " + extra : ""}`);
  };
  return {
    info:  (obj: unknown, msg?: string) => fmt("info",  obj, msg),
    warn:  (obj: unknown, msg?: string) => fmt("warn",  obj, msg),
    error: (obj: unknown, msg?: string) => fmt("error", obj, msg),
    debug: (obj: unknown, msg?: string) => fmt("debug", obj, msg),
    trace: (obj: unknown, msg?: string) => fmt("trace", obj, msg),
    fatal: (obj: unknown, msg?: string) => fmt("fatal", obj, msg),
    child: () => makeConsoleLogger(),
  };
}

export const logger = isDiscloud
  ? (makeConsoleLogger() as unknown as ReturnType<typeof pino>)
  : pino({
      level: process.env.LOG_LEVEL ?? "info",
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "res.headers['set-cookie']",
      ],
      ...(isProduction
        ? {}
        : {
            transport: {
              target: "pino-pretty",
              options: { colorize: true },
            },
          }),
    });
