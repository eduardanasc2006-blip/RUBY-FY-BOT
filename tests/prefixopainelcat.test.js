const fs = require('node:fs');
const path = require('node:path');
const estoque = require('../src/utils/estoque');
const painelcategoria = require('../src/prefixCommands/painelcategoria');

const FILE_REF = path.join(__dirname, '..', 'data', 'painel_categoria.json');
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
  if (!estoque.categoria('vip')) {
    estoque.addCategoria('vip');
    estoque.addProduto('vip', { nome: 'KVM', valor: 100, controlarQtd: true, quantidade: 5 });
  }
  await painelcategoria.execute(message, ['vip']);
  const enviouNoB = canalB.enviado === true;
  const refFoiSalva = fs.existsSync(FILE_REF);
  const payloadTemEmbed = canalB.payload?.embeds?.length === 1;
  console.log(String(enviouNoB ? 'SIM' : 'NAO') + ' -> painelcategoria enviou no canalB (#vendas)?');
  console.log(String(payloadTemEmbed ? 'SIM' : 'NAO') + ' -> payload contem embed?');
  console.log(String(refFoiSalva ? 'SIM' : 'NAO') + ' -> referencia salva?');
  if (fs.existsSync(FILE_REF)) fs.rmSync(FILE_REF);
  if (!enviouNoB || !payloadTemEmbed) process.exit(1);
})().catch((e) => { console.error('ERRO:', e); process.exit(1); });