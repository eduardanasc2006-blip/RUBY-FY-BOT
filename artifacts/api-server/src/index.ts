import app from "./app";
import { logger } from "./lib/logger";
import { startBot } from "./bot/robux";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// HTTP SERVER
const server = app.listen(port, () => {
  logger.info({ port }, "Server listening");
});

server.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});

// BOT START (com proteção)
(async () => {
  try {
    logger.info("Starting Robux bot...");
    await startBot();
    logger.info("Robux bot started successfully");
  } catch (err) {
    logger.error({ err }, "Failed to start bot");
    process.exit(1);
  }
})();
