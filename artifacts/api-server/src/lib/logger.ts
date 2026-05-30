import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
// Discloud sets DISCLOUD=true — skip pino workers (absolute paths break cross-host deploys)
const isDiscloud = !!process.env["DISCLOUD"];

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  ...(isProduction || isDiscloud
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
