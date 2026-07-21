/**
 * Script de auditoria do deploy de comandos
 * Execute: dotenv/config=./.env node auditar_deploy.mjs
 * Ou configure as variáveis no .env primeiro
 */
import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID || null;

console.log('\n╔═══════════════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                        AUDITORIA DO DEPLOY REAL                                               ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════════════════════╝\n');

// ── 1. VARIÁVEIS DE AMBIENTE ────────────────────────────────────────────────────────
console.log('========================================================================================================');
console.log('1. VARIÁVEIS DE AMBIENTE');
console.log('========================================================================================================');
console.log(`CLIENT_ID: ${clientId ? clientId.substring(0, 10) + '...' : '❌ NÃO CONFIGURADO'}`);
console.log(`GUILD_ID:  ${guildId ? guildId : '❌ NÃO CONFIGURADO (deploy GLOBAL)'}`);
console.log(`TOKEN:     ${token ? '✅ CONFIGURADO' : '❌ NÃO CONFIGURADO'}`);
console.log(`\nModo de deploy: ${guildId ? 'POR SERVIDOR (GUILD)' : 'GLOBAL'}\n`);

// ── 2. COMANDOS NO CÓDIGO ──────────────────────────────────────────────────────────
console.log('========================================================================================================');
console.log('2. COMANDOS NO CÓDIGO');
console.log('========================================================================================================');

const commandsPath = './src/commands';
const codeCommands = [];

async function readDir(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      await readDir(full);
    } else if (entry.endsWith('.mjs') || entry.endsWith('.js')) {
      try {
        const mod = await import('./' + full);
        if (mod.default?.data) {
          const name = mod.default.data.name;
          codeCommands.push(name);
        }
      } catch (e) {
        console.log(`❌ Erro em ${full}: ${e.message}`);
      }
    }
  }
}

await readDir(commandsPath);

console.log(`\nTotal de comandos encontrados no código: ${codeCommands.length}`);
codeCommands.sort().forEach((cmd, i) => console.log(`  ${i + 1}. /${cmd}`));

// ── 3. COMANDOS NO DISCORD ────────────────────────────────────────────────────────
console.log('\n========================================================================================================');
console.log('3. COMANDOS NO DISCORD');
console.log('========================================================================================================');

if (!token || !clientId) {
  console.log('\n❌ VARIÁVEIS NÃO CONFIGURADAS - IMPOSSÍVEL CONSULTAR API\n');
  console.log('Configure DISCORD_TOKEN e CLIENT_ID no .env e execute novamente.\n');
  process.exit(1);
}

const rest = new REST().setToken(token);

try {
  let discordCommands = [];
  
  if (guildId) {
    console.log(`\nConsultando comandos do servidor: ${guildId}`);
    discordCommands = await rest.get(Routes.applicationGuildCommands(clientId, guildId));
  } else {
    console.log('\nConsultando comandos globais...');
    discordCommands = await rest.get(Routes.applicationCommands(clientId));
  }

  console.log(`\nTotal de comandos no Discord: ${discordCommands.length}`);
  discordCommands.sort((a, b) => a.name.localeCompare(b.name)).forEach((cmd, i) => {
    console.log(`  ${i + 1}. /${cmd.name} (ID: ${cmd.id})`);
  });

  // ── 4. COMPARAÇÃO ────────────────────────────────────────────────────────────────
  console.log('\n========================================================================================================');
  console.log('4. COMPARAÇÃO');
  console.log('========================================================================================================');

  const discordNames = discordCommands.map(c => c.name);
  
  const missing = codeCommands.filter(c => !discordNames.includes(c));
  const extra = discordNames.filter(c => !codeCommands.includes(c));
  const match = codeCommands.filter(c => discordNames.includes(c));

  console.log(`\n✅ Comandos no código E no Discord: ${match.length}`);
  console.log(`\n❌ Comandos no código MAS NÃO no Discord: ${missing.length}`);
  if (missing.length > 0) {
    missing.sort().forEach(c => console.log(`   - /${c}`));
  }
  console.log(`\n⚠️ Comandos no Discord MAS NÃO no código: ${extra.length}`);
  if (extra.length > 0) {
    extra.sort().forEach(c => console.log(`   - /${c}`));
  }

  // ── 5. CAUSA ──────────────────────────────────────────────────────────────────
  console.log('\n========================================================================================================');
  console.log('5. CAUSA EXATA');
  console.log('========================================================================================================');

  if (missing.length > 0 && extra.length === 0) {
    console.log('\n⚠️ PROBLEMA IDENTIFICADO: Alguns comandos não foram registrados no Discord!');
    console.log('\nPossíveis causas:');
    console.log('  1. Deploy foi feito ANTES de adicionar os comandos ao código');
    console.log('  2. Deploy GLOBAL ainda não propagou (pode levar até 1 hora)');
    console.log('  3. Erro no momento do deploy (ver logs do bot ao iniciar)');
    console.log('  4. Rate limiting do Discord bloqueou alguns comandos');
  } else if (missing.length === 0 && extra.length === 0) {
    console.log('\n✅ TODOS OS COMANDOS ESTÃO REGISTRADOS!');
  } else if (extra.length > 0) {
    console.log('\n⚠️ COMANDOS ANTIGOS EXISTEM NO DISCORD');
    console.log('   Execute: node src/deploy-commands.mjs para sincronizar');
  }

  console.log('\n========================================================================================================\n');

} catch (error) {
  console.log(`\n❌ ERRO AO CONSULTAR DISCORD: ${error.message}`);
  if (error.code === 401) {
    console.log('   → Token inválido ou expirado');
  } else if (error.code === 403) {
    console.log('   → Sem permissão para acessar comandos');
  } else if (error.code === 'MissingAccess') {
    console.log('   → Bot não tem acesso ao servidor (se GUILD_ID)');
  }
  console.log('\n========================================================================================================\n');
}
