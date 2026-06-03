import { loadSystems } from "./src/loader.mjs";

process.env.PORT = process.env.PORT || "8080";
process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.DISCORD_BOT_TOKEN = "MTUwOTE0NjkzMjQ3ODQ3NjM4OQ.GrZ7rN.OhpoeTNIJXiXADTZJKl-WzgGnbI3mg4zV45iHs";

globalThis.__loadExpansion = async (client) => {
  console.log("[FiskBot] Carregando sistemas...");
  await loadSystems(client);
  console.log("[FiskBot] Sistemas carregados!");
};

console.log("[FiskBot] Iniciando...");

import("./artifacts/api-server/dist/index.mjs").catch((err) => {
  console.error("[FiskBot] Erro ao iniciar:", err);
  process.exit(1);
});
