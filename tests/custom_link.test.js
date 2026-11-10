const assert = require('node:assert');
const { buildResposta } = require('../src/utils/customCommandsPanel');
const { parseCopiaveis, montarBotoes } = require('../src/utils/copiaveis');
const { normalizarUrl } = require('../src/utils/links');

// ----- normalizarUrl: só http/https, sem "consertar" outros esquemas -----
assert.strictEqual(normalizarUrl('discord.gg/abc'), 'https://discord.gg/abc', 'sem protocolo ganha https');
assert.strictEqual(normalizarUrl('https://discord.gg/abc'), 'https://discord.gg/abc', 'https mantido');
assert.strictEqual(normalizarUrl('http://exemplo.com'), 'http://exemplo.com/', 'http aceito');
assert.strictEqual(normalizarUrl('mailto:x@y.com'), null, 'mailto rejeitado (não vira link quebrado)');
assert.strictEqual(normalizarUrl('ftp://servidor'), null, 'ftp rejeitado');
assert.strictEqual(normalizarUrl('javascript:alert(1)'), null, 'javascript: rejeitado');
assert.strictEqual(normalizarUrl(''), null, 'vazio rejeitado');
assert.strictEqual(normalizarUrl('abc'), null, 'sem domínio rejeitado');

// ----- parseCopiaveis -----
const so = parseCopiaveis('PIX:12345678900', 5);
assert.strictEqual(so.itens.length, 1);
assert.strictEqual(so.itens[0].tipo, 'copiavel', 'nome:valor vira copiável');
assert.strictEqual(so.itens[0].valor, '12345678900');
assert.strictEqual(so.linkInvalido, null);

const comLink = parseCopiaveis('Entrega:link:discord.gg/abc', 5);
assert.strictEqual(comLink.itens[0].tipo, 'link');
assert.strictEqual(comLink.itens[0].valor, 'https://discord.gg/abc', 'link normalizado');

const ruim = parseCopiaveis('Entrega:link:ftp://x', 5);
assert.ok(ruim.linkInvalido, 'link inválido é sinalizado');
assert.strictEqual(ruim.itens.length, 0);

const muitos = parseCopiaveis('a:1;b:2;c:3;d:4;e:5;f:6', 5);
assert.strictEqual(muitos.excedeu, true, 'mais de 5 é sinalizado');
assert.strictEqual(muitos.itens.length, 6);

// ----- montarBotoes: link dedicado primeiro, respeitando o limite de 5 -----
const bt = montarBotoes({ linkRotulo: 'Entrar', linkUrl: 'discord.gg/abc', copiaveis: [{ nome: 'PIX', tipo: 'copiavel', valor: '1' }] }, 5);
assert.strictEqual(bt[0].tipo, 'link', 'link dedicado vem primeiro');
assert.strictEqual(bt.length, 2);

const btLimite = montarBotoes({ linkRotulo: 'L', linkUrl: 'discord.gg/abc', copiaveis: Array.from({ length: 6 }, (_, i) => ({ nome: 'c' + i, tipo: 'copiavel', valor: String(i) })) }, 5);
assert.strictEqual(btLimite.length, 5, 'limite de 5 botões (Discord)');

// ----- buildResposta: botão de link nativo (style 5) e copiável (style 2) -----
const cmdLink = {
  nome: 'entrega',
  mensagem: 'Clique para entrar no servidor de entrega.',
  embed: null,
  ephemeral: false,
  copiaveis: [{ nome: 'Entrar no servidor', tipo: 'link', valor: 'https://discord.gg/abc' }],
};
const r = buildResposta(cmdLink);
const comp = r.components[0].toJSON().components[0];
assert.strictEqual(comp.style, 5, 'botão de link é style 5 (nativo)');
assert.strictEqual(comp.url, 'https://discord.gg/abc');
assert.strictEqual(comp.custom_id, undefined, 'botão de link não tem custom_id (sem handler)');
assert.strictEqual(comp.label, '🔗 Entrar no servidor', 'ganha ícone quando o rótulo não tem emoji');

const rEmoji = buildResposta({ ...cmdLink, copiaveis: [{ nome: '🎁 Entrar', tipo: 'link', valor: 'https://discord.gg/x' }] });
assert.strictEqual(rEmoji.components[0].toJSON().components[0].label, '🎁 Entrar', 'não duplica emoji quando o rótulo já tem um');

const cmdPix = buildResposta({ ...cmdLink, copiaveis: [{ nome: 'PIX', tipo: 'copiavel', valor: '12345678900' }] });
const compPix = cmdPix.components[0].toJSON().components[0];
assert.strictEqual(compPix.style, 2, 'copiável é style 2 (com handler)');
assert.ok(String(compPix.custom_id).startsWith('custom:copy:entrega:'), 'copiável tem custom_id de cópia');

// Misto: link + copiável na mesma linha
const rMisto = buildResposta({ ...cmdLink, copiaveis: [
  { nome: 'Servidor', tipo: 'link', valor: 'https://discord.gg/x' },
  { nome: 'PIX', tipo: 'copiavel', valor: '123' },
] });
const estilos = rMisto.components[0].toJSON().components.map((c) => c.style);
assert.deepStrictEqual(estilos, [5, 2], 'link e copiável convivem na linha');

console.log('testes custom_link OK');
