import { readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commandsPath = join(__dirname, '..', 'commands');

/**
 * Carrega todos os comandos da pasta src/commands/ recursivamente.
 *
 * Cada arquivo de comando pode exportar um objeto default com:
 *
 *   Slash command:
 *     - data:           SlashCommandBuilder
 *     - execute:        async (interaction) => void
 *
 *   Prefix command:
 *     - name:           string  (ex: 'ping')
 *     - aliases:        string[] (opcional)
 *     - executePrefix:  async (message, args) => void
 *
 *   Um comando pode implementar os dois formatos ao mesmo tempo.
 *
 * Os comandos são registrados em:
 *   client.commands      → slash commands (por data.name)
 *   client.prefixCommands → prefix commands (por name + aliases)
 */
export async function loadCommands(client) {
  let slashLoaded = 0;
  let prefixLoaded = 0;

  const filePaths = [];

  function readDir(dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        readDir(full);
      } else if (entry.endsWith('.mjs') || entry.endsWith('.js')) {
        filePaths.push(full);
      }
    }
  }

  readDir(commandsPath);

  for (const filePath of filePaths) {
    const module = await import(pathToFileURL(filePath).href);
    const command = module.default;

    if (!command) {
      console.warn(`[CommandHandler] Arquivo ignorado (sem export default): ${filePath}`);
      continue;
    }

    // Registro como slash command
    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
      slashLoaded++;
    }

    // Registro como prefix command
    if (command.name && command.executePrefix) {
      client.prefixCommands.set(command.name.toLowerCase(), command);

      if (Array.isArray(command.aliases)) {
        for (const alias of command.aliases) {
          client.prefixCommands.set(alias.toLowerCase(), command);
        }
      }

      prefixLoaded++;
    }
  }

  console.log(`[CommandHandler] Slash: ${slashLoaded} | Prefixo: ${prefixLoaded} comando(s) carregado(s).`);
}
