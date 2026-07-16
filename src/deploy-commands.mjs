/**
 * Script de deploy de slash commands para o Discord.
 * Execute com: node src/deploy-commands.mjs
 *
 * Usa GUILD_ID (se definido) para deploy rápido em servidor de testes.
 * Sem GUILD_ID, faz deploy global (pode demorar até 1 hora para propagar).
 */
import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Obtém o CLIENT_ID a partir do token (base64 da primeira parte)
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('[Deploy] DISCORD_TOKEN não encontrado no .env');
  process.exit(1);
}

const clientId = Buffer.from(token.split('.')[0], 'base64').toString('ascii');
const guildId  = process.env.GUILD_ID || null;

// Coleta os dados de todos os comandos slash
const commands = [];
const commandsPath = join(__dirname, 'commands');

async function readDir(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      await readDir(full);
    } else if (entry.endsWith('.mjs') || entry.endsWith('.js')) {
      const mod = await import(pathToFileURL(full).href);
      if (mod.default?.data) {
        commands.push(mod.default.data.toJSON());
      }
    }
  }
}

await readDir(commandsPath);

const rest = new REST().setToken(token);

try {
  console.log(`[Deploy] Registrando ${commands.length} comando(s)...`);

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log(`[Deploy] ✅ Deploy em guild ${guildId} concluído.`);
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('[Deploy] ✅ Deploy global concluído (pode demorar até 1 hora para aparecer).');
  }
} catch (err) {
  console.error('[Deploy] ❌ Erro:', err);
  process.exit(1);
}
