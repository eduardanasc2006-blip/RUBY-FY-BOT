import { readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commandsPath = join(__dirname, '..', 'commands');

/**
 * Carrega todos os comandos da pasta src/commands/ recursivamente.
 * Cada arquivo de comando deve exportar um objeto default com:
 *   - data: SlashCommandBuilder
 *   - execute: async (interaction) => void
 */
export async function loadCommands(client) {
  let loaded = 0;

  function readDir(dir) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      if (statSync(fullPath).isDirectory()) {
        readDir(fullPath);
      } else if (entry.endsWith('.mjs') || entry.endsWith('.js')) {
        pendingLoads.push(fullPath);
      }
    }
  }

  const pendingLoads = [];
  readDir(commandsPath);

  for (const filePath of pendingLoads) {
    const module = await import(pathToFileURL(filePath).href);
    const command = module.default;

    if (!command?.data || !command?.execute) {
      console.warn(`[CommandHandler] Arquivo ignorado (sem data/execute): ${filePath}`);
      continue;
    }

    client.commands.set(command.data.name, command);
    loaded++;
  }

  console.log(`[CommandHandler] ${loaded} comando(s) carregado(s).`);
}
