import { Client, GatewayIntentBits, Partials } from "discord.js";
import { loadSystems } from "./src/loader.mjs";

// ════════════════════════════════════════════════════════
//  TOKEN — pode ser variável de ambiente ou fixo aqui
// ════════════════════════════════════════════════════════
const TOKEN = process.env.DISCORD_BOT_TOKEN || "MTUwOTE0NjkzMjQ3ODQ3NjM4OQ.GrZ7rN.OhpoeTNIJXiXADTZJKl-WzgGnbI3mg4zV45iHs";

// ════════════════════════════════════════════════════════
//  PROTEÇÃO CONTRA TRAVAMENTOS
// ════════════════════════════════════════════════════════
process.on('unhandledRejection', (reason) => {
  console.error('[FiskBot] Rejeição não tratada:', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
  console.error('[FiskBot] Exceção não capturada:', err.message);
  // Não encerra o processo — mantém o bot rodando
});

// ════════════════════════════════════════════════════════
//  CLIENTE DISCORD
// ════════════════════════════════════════════════════════
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
});

client.on('error', (err) => {
  console.error('[Discord] Erro de conexão:', err.message);
});

client.on('shardError', (err) => {
  console.error('[Discord] Erro de shard:', err.message);
});

// ════════════════════════════════════════════════════════
//  RECONEXÃO AUTOMÁTICA
// ════════════════════════════════════════════════════════
client.on('disconnect', () => {
  console.warn('[Discord] Bot desconectado. Reconectando...');
});

// ════════════════════════════════════════════════════════
//  READY
// ════════════════════════════════════════════════════════
client.once("ready", () => {
  console.log(`[FiskBot] ✅ Online como ${client.user.tag}`);
  client.user.setActivity("!ajuda", { type: 2 });
});

// ════════════════════════════════════════════════════════
//  INICIALIZAÇÃO
// ════════════════════════════════════════════════════════
console.log("[FiskBot] Carregando sistemas...");

try {
  await loadSystems(client);
  console.log("[FiskBot] ✅ Sistemas carregados! Fazendo login...");
} catch (e) {
  console.error("[FiskBot] ❌ Erro ao carregar sistemas:", e.message);
}

if (!TOKEN || TOKEN === "COLOQUE_SEU_TOKEN_AQUI") {
  console.error("[FiskBot] ❌ TOKEN não configurado!");
  process.exit(1);
}

client.login(TOKEN);
