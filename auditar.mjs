/**
 * Script de auditoria - Execute no servidor de produção
 * 
 * Uso:
 *   DISCORD_TOKEN=seu_token CLIENT_ID=seu_id GUILD_ID=seu_guild node auditar.mjs
 * 
 * Ou edite as variáveis abaixo:
 */
const DISCORD_TOKEN = 'MTI1Njk2OTE3OTA4Mzg5ODk3MQ.GGWx88.Zp2vbeYsKziNU-yhfYfnOMDBE9sAR36IvbMqvs';
const CLIENT_ID = '1509146932478476389';
const GUILD_ID = null; // null = global, ou 'ID_DO_SERVIDOR' para testar

import { REST, Routes } from 'discord.js';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                              AUDITORIA DO DEPLOY                                            ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════════════════════╝\n');

  // ── COMANDOS NO CÓDIGO ─────────────────────────────────────────────────────────────────
  console.log('📁 COMANDOS NO CÓDIGO:');
  const codeCommands = [];
  
  async function readDir(dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        await readDir(full);
      } else if (entry.endsWith('.mjs') || entry.endsWith('.js')) {
        try {
          const mod = await import('./' + full);
          if (mod.default?.data?.name) {
            codeCommands.push(mod.default.data.name);
          }
        } catch (e) {}
      }
    }
  }
  
  await readDir('./src/commands');
  console.log(`   Total: ${codeCommands.length} comandos\n`);
  codeCommands.sort().forEach((cmd, i) => console.log(`   ${i + 1}. /${cmd}`));

  // ── COMANDOS NO DISCORD ─────────────────────────────────────────────────────────────────
  console.log('\n📡 COMANDOS NO DISCORD:');
  
  try {
    let discordCommands;
    
    if (GUILD_ID) {
      console.log(`   Modo: GUILD (servidor específico)\n`);
      discordCommands = await rest.get(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID));
    } else {
      console.log(`   Modo: GLOBAL\n`);
      discordCommands = await rest.get(Routes.applicationCommands(CLIENT_ID));
    }
    
    console.log(`   Total: ${discordCommands.length} comandos\n`);
    discordCommands.sort((a, b) => a.name.localeCompare(b.name)).forEach((cmd, i) => {
      console.log(`   ${i + 1}. /${cmd.name}`);
    });

    // ── COMPARAÇÃO ─────────────────────────────────────────────────────────────────────
    console.log('\n╔═══════════════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                                  COMPARAÇÃO                                                 ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════════════════════════╝\n');

    const discordNames = discordCommands.map(c => c.name);
    const missing = codeCommands.filter(c => !discordNames.includes(c));
    const extra = discordNames.filter(c => !codeCommands.includes(c));

    console.log(`✅ No código E no Discord: ${codeCommands.length - missing.length}`);
    console.log(`❌ No código MAS NÃO no Discord: ${missing.length}`);
    if (missing.length > 0) {
      missing.sort().forEach(c => console.log(`   - /${c}`));
    }
    console.log(`⚠️  No Discord MAS NÃO no código: ${extra.length}`);
    if (extra.length > 0) {
      extra.sort().forEach(c => console.log(`   - /${c}`));
    }

    // ── RESUMO ─────────────────────────────────────────────────────────────────────────
    console.log('\n╔═══════════════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                                    RESUMO                                                     ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════════════════════════╝\n');

    if (missing.length === 0 && extra.length === 0) {
      console.log('🎉 TODOS OS COMANDOS ESTÃO REGISTRADOS!');
    } else if (missing.length > 0) {
      console.log('⚠️  ALGUNS COMANDOS NÃO ESTÃO REGISTRADOS!');
      console.log('\n   Para registrar, edite GUILD_ID acima (para servidor específico)');
      console.log('   ou deixe null (para global) e execute: node src/deploy-commands.mjs');
    }

  } catch (error) {
    console.log(`\n❌ ERRO: ${error.message}`);
    if (error.code === 401) console.log('   Token inválido');
    if (error.code === 403) console.log('   Sem permissão');
  }
  
  console.log('\n');
}

main();
