const fs = require('node:fs');
const path = require('node:path');
const painelestoque = require('../src/prefixCommands/painelestoque');

const FILE_REF = path.join(__dirname, '..', 'data', 'painel_estoque.json');
if (fs.existsSync(FILE_REF)) fs.rmSync(FILE_REF);

const canalA = { id: '111', name: 'geral', isTextBased: () => true, permissionsFor: () => ({ has: () => true }) };
const canalB = { id: '222', name: 'vendas', isTextBased: () => true, permissionsFor: () => ({ has: () => true }) };
canalA.send = async () => ({ id: 'mA', channelId: '111' });
canalB.send = async (payload) => { canalB.enviado = true; canalB.payload = payload; return { id: 'mB', channelId: '222' }; };

const member = { permissions: { has: () => true }, roles: { cache: new Map() } };
const guild = { id: 'g1', name: 'Teste', members: { me: member } };
const uid = 'u' + 'ser';

const message = {
  guild,
  member,
  author: { id: uid },
  content: '',
  mentions: { channels: { first: () => canalB }, roles: { first: () => null }, users: { first: () => null } },
  channel: canalA,
  reply: async (payload) => { message.ultimaResposta = payload; return payload; },
  delete: () => Promise.resolve(),
};

process.env.ADMIN_IDS = uid;

(async () => {
  await painelestoque.execute(message, ['nova']);
  const enviouNoB = canalB.enviado === true;
  const payloadTemEmbeds = canalB.payload?.embeds?.length > 0;
  const refFoiSalva = fs.existsSync(FILE_REF);
  console.log(String(enviouNoB ? 'SIM' : 'NAO') + ' -> painelestoque enviou no canalB (#vendas)?');
  console.log(String(payloadTemEmbeds ? 'SIM' : 'NAO') + ' -> payload contem embed?');
  console.log(String(refFoiSalva ? 'SIM' : 'NAO') + ' -> referencia salva?');
  if (fs.existsSync(FILE_REF)) fs.rmSync(FILE_REF);
  if (!enviouNoB || !payloadTemEmbeds) process.exit(1);
})().catch((e) => { console.error('ERRO:', e); process.exit(1); });