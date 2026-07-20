import 'dotenv/config';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { initDatabase } from './database/client.mjs';
import { startSessionCleanup } from './core/sessionManager.mjs';
import { registerEditorHandler }      from './modules/editor/index.mjs';
import { registerEmbedHandler }       from './modules/embed/index.mjs';
import { registerTemplatesHandler }   from './modules/templates/index.mjs';
import { registerConnectionsHandler }    from './modules/connections/index.mjs';
import { registerTicketsHandler }        from './modules/tickets/index.mjs';
import { registerCustomPanelsHandler }   from './modules/custompanels/index.mjs';
import { registerProofsHandler }      from './modules/proofs/index.mjs';
import { registerOrdersHandler }      from './modules/orders/index.mjs';
import { registerClientsHandler }     from './modules/clients/index.mjs';
import { registerPainelHandler }      from './modules/painel/index.mjs';
import { registerAutomationsHandler } from './modules/automations/index.mjs';
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

// Collections de comandos
client.commands       = new Collection(); // slash commands
client.prefixCommands = new Collection(); // prefix commands (! )

// ── Banco de dados ──────────────────────────────────────────────────────────
initDatabase();

// ── Sessões temporárias ─────────────────────────────────────────────────────
startSessionCleanup();

// ── Editor Visual + módulos ─────────────────────────────────────────────────
registerEditorHandler();
registerEmbedHandler();
registerTemplatesHandler();
registerConnectionsHandler();
registerTicketsHandler();
registerProofsHandler();
registerCustomPanelsHandler();
registerOrdersHandler();
registerClientsHandler();
registerPainelHandler();
registerAutomationsHandler();

// ── Carregamento de handlers ────────────────────────────────────────────────
logger.info('Iniciando carregamento de comandos e eventos...');

await loadCommands(client);
await loadEvents(client);

// ── Login ───────────────────────────────────────────────────────────────────
logger.info('Conectando ao Discord...');
client.login(process.env.DISCORD_TOKEN);
