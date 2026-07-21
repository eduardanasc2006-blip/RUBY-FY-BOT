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

/**
 * Coleta os dados de todos os comandos slash da pasta commands/
 * @returns {Promise<{commands: Array, seenNames: Map}>}
 */
async function collectCommands() {
  const commands = [];
  const commandsPath = join(__dirname, 'commands');
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
  return { commands, seenNames };
}

/**
 * Executa o deploy de comandos para o Discord.
 * Pode ser usado tanto como script standalone quanto como função importada.
 * 
 * @param {Object} options - Opções do deploy
 * @param {string} options.token - Token do bot (obrigatório)
 * @param {string} options.clientId - ID do cliente (obrigatório)
 * @param {string} [options.guildId] - ID do servidor para deploy rápido
 * @param {Array} [options.commands] - Lista de comandos (se não fornecido, coleta automaticamente)
 * @param {Map} [options.seenNames] - Mapa de nomes já vistos (se não fornecido, coleta automaticamente)
 * @returns {Promise<{registered: number, orphans: number, duplicates: number}>}
 */
export async function deployCommands({ token, clientId, guildId = null, commands = null, seenNames = null } = {}) {
  // Se não foram fornecidos comandos, coleta automaticamente
  if (!commands || !seenNames) {
    const collected = await collectCommands();
    commands = collected.commands;
    seenNames = collected.seenNames;
  }

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
    console.log('[Deploy] 📋 Lista de comandos enviados:');
    commands.forEach((cmd, i) => {
      console.log(`[Deploy]   ${i + 1}. /${cmd.name}`);
    });

    if (guildId) {
      console.log(`[Deploy] 🔗 URL: /applications/${clientId}/guilds/${guildId}/commands`);
      const response = await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      console.log(`[Deploy] ✅ Deploy em guild ${guildId} concluído.`);
      console.log(`[Deploy] 📊 Resposta da API: ${response.length} comandos registrados`);
    } else {
      console.log(`[Deploy] 🔗 URL: /applications/${clientId}/commands (GLOBAL)`);
      const response = await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log('[Deploy] ✅ Deploy global concluído (pode demorar até 1 hora para aparecer).');
      console.log(`[Deploy] 📊 Resposta da API: ${response.length} comandos registrados`);
    }
    
    console.log('\n[Deploy] 📋 Resumo:');
    console.log(`    - Comandos registrados: ${commands.length}`);
    console.log(`    - Comandos órfãos removidos: ${orphanCommands.length}`);
    console.log(`    - Duplicatas removidas: ${duplicateIds.length}`);
    
    return {
      registered: commands.length,
      orphans: orphanCommands.length,
      duplicates: duplicateIds.length,
    };
    
  } catch (err) {
    console.error('[Deploy] ❌ Erro:', err);
    throw err;
  }
}

/**
 * Executa o deploy usando variáveis de ambiente.
 * Usado pelo script standalone: node src/deploy-commands.mjs
 */
async function main() {
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

  await deployCommands({ token, clientId, guildId });
}

// Executa apenas se for rodado diretamente (não se for importado)
// Em ES Modules, import.meta.url contém o caminho do arquivo atual
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch(console.error);
}
