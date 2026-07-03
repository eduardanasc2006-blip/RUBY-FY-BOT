import { Client, GatewayIntentBits, Partials } from "discord.js";
import { loadSystems } from "./src/loader.mjs";

const TOKEN = process.env.DISCORD_BOT_TOKEN;

process.on('unhandledRejection', (reason) => {
  console.error('[FiskBot] Rejeição não tratada:', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
  console.error('[FiskBot] Exceção não capturada:', err.message);
});

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

client.once("ready", () => {
  console.log(`[FiskBot] ✅ Online como ${client.user.tag}`);
  client.user.setActivity("!ajuda", { type: 2 });
});

console.log("[FiskBot] Carregando sistemas...");

try {
  await loadSystems(client);
  console.log("[FiskBot] ✅ Sistemas carregados! Fazendo login...");
} catch (e) {
  console.error("[FiskBot] ❌ Erro ao carregar sistemas:", e.message);
}

if (!TOKEN) {
  console.error("[FiskBot] ❌ DISCORD_BOT_TOKEN não configurado!");
  process.exit(1);
}

client.login(TOKEN);
