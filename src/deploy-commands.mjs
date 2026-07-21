/**
 * Script de deploy de slash commands para o Discord.
 * Execute com: node src/deploy-commands.mjs
 *
 * Este script é IDEMPOTENTE:
 * - Remove comandos órfãos (que existem no Discord mas não no código)
 * - Não cria duplicatas
 * - Pode ser executado múltiplas vezes com segurança
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

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token) {
  console.error('[Deploy] DISCORD_TOKEN não encontrado no .env');
  process.exit(1);
}

if (!clientId) {
  console.error('[Deploy] CLIENT_ID não encontrado no .env');
  process.exit(1);
}

const guildId = process.env.GUILD_ID || null;

// Coleta os dados de todos os comandos slash
const commands = [];
const commandsPath = join(__dirname, 'commands');

// Rastrear nomes de comandos para detectar duplicatas no código
const seenNames = new Map();

async function readDir(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      await readDir(full);
    } else if (entry.endsWith('.mjs') || entry.endsWith('.js')) {
      const mod = await import(pathToFileURL(full).href);
      if (mod.default?.data) {
        const name = mod.default.data.name;
        
        // Verificar duplicatas no código
        if (seenNames.has(name)) {
          console.warn(`[Deploy] ⚠️ Comando duplicado no código: /${name} (${full})`);
          console.warn(`[Deploy]    Já encontrado em: ${seenNames.get(name)}`);
          continue;
        }
        
        seenNames.set(name, full);
        commands.push(mod.default.data.toJSON());
      }
    }
  }
}

await readDir(commandsPath);

const rest = new REST().setToken(token);

console.log(`[Deploy] 📦 ${commands.length} comando(s) encontrado(s) no código.`);

try {
  // ── 1. Buscar comandos existentes no Discord ─────────────────────────────────
  let existingCommands = [];
  
  if (guildId) {
    existingCommands = await rest.get(Routes.applicationGuildCommands(clientId, guildId));
  } else {
    existingCommands = await rest.get(Routes.applicationCommands(clientId));
  }
  
  console.log(`[Deploy] 📊 ${existingCommands.length} comando(s) já registrado(s) no Discord.`);
  
  // ── 2. Identificar comandos órfãos ──────────────────────────────────────────
  const existingNames = new Set(existingCommands.map(cmd => cmd.name));
  const orphanCommands = existingCommands.filter(cmd => !seenNames.has(cmd.name));
  
  // ── 3. Identificar comandos duplicados no Discord ──────────────────────────
  const nameToIds = new Map();
  for (const cmd of existingCommands) {
    const ids = nameToIds.get(cmd.name) || [];
    ids.push(cmd.id);
    nameToIds.set(cmd.name, ids);
  }
  
  const duplicateIds = [];
  for (const [name, ids] of nameToIds) {
    if (ids.length > 1) {
      console.log(`[Deploy] ⚠️ Comando /${name} tem ${ids.length} duplicatas no Discord.`);
      // Manter apenas o primeiro ID, marcar os outros para remoção
      duplicateIds.push(...ids.slice(1));
    }
  }
  
  // ── 4. Remover comandos órfãos e duplicatas ────────────────────────────────
  const toRemove = [...orphanCommands, ...duplicateIds];
  
  if (toRemove.length > 0) {
    console.log(`[Deploy] 🗑️  Removendo ${toRemove.length} comando(s) inválido(s)...`);
    
    for (const cmd of toRemove) {
      try {
        if (guildId) {
          await rest.delete(Routes.applicationGuildCommand(clientId, guildId, cmd.id));
        } else {
          await rest.delete(Routes.applicationCommand(clientId, cmd.id));
        }
        console.log(`[Deploy]    ✅ Removido: /${cmd.name || '(duplicata)'}`);
      } catch (err) {
        console.error(`[Deploy]    ❌ Erro ao remover /${cmd.name}: ${err.message}`);
      }
    }
  }
  
  // ── 5. Registrar comandos atualizados ──────────────────────────────────────
  console.log(`[Deploy] ✨ Registrando ${commands.length} comando(s)...`);

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log(`[Deploy] ✅ Deploy em guild ${guildId} concluído.`);
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('[Deploy] ✅ Deploy global concluído (pode demorar até 1 hora para aparecer).');
  }
  
  console.log('\n[Deploy] 📋 Resumo:');
  console.log(`    - Comandos registrados: ${commands.length}`);
  console.log(`    - Comandos órfãos removidos: ${orphanCommands.length}`);
  console.log(`    - Duplicatas removidas: ${duplicateIds.length}`);
  
} catch (err) {
  console.error('[Deploy] ❌ Erro:', err);
  process.exit(1);
}
