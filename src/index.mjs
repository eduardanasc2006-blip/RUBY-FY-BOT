import 'dotenv/config';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { loadCommands } from './handlers/commandHandler.mjs';
import { loadEvents } from './handlers/eventHandler.mjs';
import { logger } from './utils/logger.mjs';

// ── Validação do token ──────────────────────────────────────────────────────
if (!process.env.DISCORD_TOKEN) {
  logger.error('DISCORD_TOKEN não encontrado no arquivo .env. O bot não pode iniciar.');
  process.exit(1);
}

// ── Criação do client ───────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Collection para armazenar comandos
client.commands = new Collection();

// ── Carregamento de handlers ────────────────────────────────────────────────
logger.info('Iniciando carregamento de comandos e eventos...');

await loadCommands(client);
await loadEvents(client);

// ── Login ───────────────────────────────────────────────────────────────────
logger.info('Conectando ao Discord...');
client.login(process.env.DISCORD_TOKEN);
