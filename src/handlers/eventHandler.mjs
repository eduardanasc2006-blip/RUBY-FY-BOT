import { readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const eventsPath = join(__dirname, '..', 'events');

/**
 * Carrega todos os eventos da pasta src/events/ recursivamente.
 * Cada arquivo de evento deve exportar um objeto default com:
 *   - name: string (nome do evento Discord.js, ex: 'interactionCreate')
 *   - once: boolean (opcional, dispara apenas uma vez)
 *   - execute: async (...args) => void
 */
export async function loadEvents(client) {
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
  readDir(eventsPath);

  for (const filePath of pendingLoads) {
    const module = await import(pathToFileURL(filePath).href);
    const event = module.default;

    if (!event?.name || !event?.execute) {
      console.warn(`[EventHandler] Arquivo ignorado (sem name/execute): ${filePath}`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }

    loaded++;
  }

  console.log(`[EventHandler] ${loaded} evento(s) carregado(s).`);
}
