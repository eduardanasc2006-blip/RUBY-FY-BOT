import { loadSystems } from "./src/loader.mjs";

process.env.PORT = process.env.PORT || "8080";
process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.DISCORD_BOT_TOKEN = "MTUwOTE0NjkzMjQ3ODQ3NjM4OQ.GrZ7rN.OhpoeTNIJXiXADTZJKl-WzgGnbI3mg4zV45iHs";

// ── Cole aqui a sua string do MongoDB Atlas ────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://USUARIO:SENHA@cluster.mongodb.net/fiskbot";

// ── Hook injetado no bundle para receber o client Discord ──────────────────
globalThis.__loadExpansion = async (client) => {
  console.log("[FiskBot] Carregando sistemas da expansão...");
  await loadSystems(client, MONGODB_URI);
  console.log("[FiskBot] ✅ Expansão ativa!");
};

console.log("[FiskBot] Iniciando...");
import("./artifacts/api-server/dist/index.mjs").catch((err) => {
  console.error("[FiskBot] Erro ao iniciar:", err);
  process.exit(1);
});
