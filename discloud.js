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
  console.error("[FiskBot] ➜ Configure a variável de ambiente DISCORD_BOT_TOKEN no painel do Discloud:");
  console.error("[FiskBot]   1. Acesse o painel do seu bot no Discloud");
  console.error("[FiskBot]   2. Vá em Variáveis de Ambiente (ou edite o discloud.config)");
  console.error("[FiskBot]   3. Adicione DISCORD_BOT_TOKEN com o token do Discord Developer Portal");
  console.error("[FiskBot]   4. Reinicie o bot");
  process.exit(1);
}

client.login(TOKEN);
