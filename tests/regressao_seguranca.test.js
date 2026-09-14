// Regressao de seguranca: painel publico de auto-respostas e sessao de
// boas-vindas por guild.
process.env.DISCORD_TOKEN = 'fake-token';
process.env.ADMIN_IDS = '111111111111111111';
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('discord.js');
let capturado = null;
const loginOriginal = Client.prototype.login;
Client.prototype.login = async function () { capturado = this; return 'local'; };
require('../src/index.js');
Client.prototype.login = loginOriginal;
const client = capturado;

let falhas = 0;
let ok = 0;
function registrar(nome, cond, detalhe) {
  if (cond) { ok++; console.log('[OK] ' + nome); }
  else { falhas++; console.log('[FALHA] ' + nome + ' -> ' + (detalhe || '')); }
}

// ---------- 1) autoresp:limparsim bloqueado para nao-admin ----------
const store = require('../src/utils/autoRespostaStore');
const g = '888888888888888888';
const arq = path.join(__dirname, '..', 'data', 'autorespostas', g + '.json');
fs.mkdirSync(path.dirname(arq), { recursive: true });
try { fs.rmSync(arq); } catch (e) {}
store.adicionar(g, 'estoque', 'veja vendas', []);

const memberComum = { guild: { id: g }, roles: { cache: [] }, permissions: { has: () => false } };
let respostaAdmin = null;
let atualizou = false;
const interactionComum = {
  isButton: () => true,
  isAnySelectMenu: () => false,
  isStringSelectMenu: () => false,
  isChannelSelectMenu: () => false,
  isRoleSelectMenu: () => false,
  isModalSubmit: () => false,
  customId: 'autoresp:limparsim',
  user: { id: '222222222222222222' },
  member: memberComum,
  guild: { id: g },
  guildId: g,
  channel: { id: '333333333333333333' },
  message: { flags: { has: () => false } },
  values: [],
  update: async () => { atualizou = true; },
  reply: async (p) => { respostaAdmin = p; },
};

Promise.resolve(client.emit('interactionCreate', interactionComum))
  .then(() => {
    const restantes = store.listar(g);
    registrar('autoresp:limparsim NAO apaga auto-respostas para membro comum', restantes.length === 1 && !atualizou,
      'restantes=' + restantes.length + ' atualizou=' + atualizou);
    registrar('autoresp:limparsim responde bloqueio', respostaAdmin && /Somente administradores/.test(JSON.stringify(respostaAdmin)),
      JSON.stringify(respostaAdmin));

    // ---------- 2) admin continua conseguindo ----------
    const memberAdmin = {
      guild: { id: g },
      roles: { cache: [] },
      permissions: { has: () => true },
    };
    let adminUpdate = null;
    const interactionAdmin = {
      isButton: () => true,
      isAnySelectMenu: () => false,
      isStringSelectMenu: () => false,
      isChannelSelectMenu: () => false,
      isRoleSelectMenu: () => false,
      isModalSubmit: () => false,
      customId: 'autoresp:limparsim',
      user: { id: '111111111111111111' },
      member: memberAdmin,
      guild: { id: g },
      guildId: g,
      channel: { id: '333333333333333333' },
      message: { flags: { has: () => false } },
      values: [],
      update: async (p) => { adminUpdate = p; },
      reply: async () => {},
    };
    return Promise.resolve(client.emit('interactionCreate', interactionAdmin));
  })
  .then(() => {
    const restantes = store.listar(g);
    registrar('autoresp:limparsim admin apaga (nada quebrado)', restantes.length === 0,
      'restantes=' + restantes.length);
    try { fs.rmSync(arq); } catch (e) {}

    // ---------- 3) sessao welcome por guild ----------
    const { getSessaoWelcome, limparSessaoWelcome } = require('../src/utils/welcomePainel');
    const gA = '600000000000000001';
    const gB = '600000000000000002';
    const arqA = path.join(__dirname, '..', 'data', 'welcome', gA + '.json');
    const arqB = path.join(__dirname, '..', 'data', 'welcome', gB + '.json');
    try { fs.rmSync(arqA); } catch (e) {}
    try { fs.rmSync(arqB); } catch (e) {}

    const sA = getSessaoWelcome('user-x', gA);
    sA.config.canalId = 'CANAL_DE_A';
    const sB = getSessaoWelcome('user-x', gB);
    registrar('sessao welcome NAO vaza entre servidores', sB.config.canalId !== 'CANAL_DE_A' && sB.config !== sA.config,
      'canalB=' + sB.config.canalId);

    sB.config.canalId = 'CANAL_DE_B';
    limparSessaoWelcome('user-x', gA);
    const sA2 = getSessaoWelcome('user-x', gA);
    registrar('sessao welcome de A independe de B mesmo apos limpar', sA2.config.canalId !== 'CANAL_DE_B',
      'canalA2=' + sA2.config.canalId);
    limparSessaoWelcome('user-x', gB);
    try { fs.rmSync(arqA); } catch (e) {}
    try { fs.rmSync(arqB); } catch (e) {}
  })
  .then(() => {
    console.log('\nREGRESSAO SEGURANCA: ' + ok + ' ok, ' + falhas + ' falhas');
    process.exit(falhas ? 1 : 0);
  })
  .catch((e) => {
    console.error('ERRO FATAL:', e);
    process.exit(1);
  });