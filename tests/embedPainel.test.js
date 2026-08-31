const assert = require('node:assert');
const { urlValida, camposValidos, buildEmbed, buildPreview, buildPainel, getSessao, limparSessao } = require('../src/utils/embedPainel');

assert.strictEqual(urlValida('https://cdn.discordapp.com/x.png'), true);
assert.strictEqual(urlValida('http://exemplo.com/a.png'), true);
assert.strictEqual(urlValida('www.exemplo.com/x.png'), false, 'sem protocolo deve ser invalida');
assert.strictEqual(urlValida('http:x.com'), false, 'http sem // deve ser invalida');
assert.strictEqual(urlValida('ftp://x.com/a.png'), false, 'ftp deve ser invalida');
assert.strictEqual(urlValida(''), false);
assert.strictEqual(urlValida(null), false);

const fields = camposValidos([
  { name: 'A', value: '1', inline: true },
  { name: '', value: 'vazio' },
  { name: 'x'.repeat(300), value: 'y' },
  null,
]);
assert.strictEqual(fields.length, 2);
assert.strictEqual(fields[0].name, 'A');
assert.strictEqual(fields[1].name.length, 256, 'trunca para 256');
assert.strictEqual(fields[1].value, 'y');

const estValido = { titulo: 'T', descricao: 'D', cor: null, imagem: 'https://x.com/a.png', thumbnail: null, autor: null, rodape: null, fields: [], textoFora: null, cargos: [] };
const e = buildEmbed(estValido);
assert.ok(e, 'embed valida construida');
assert.strictEqual(e.data.image.url, 'https://x.com/a.png');

const s = getSessao('user-teste');
s.titulo = 'T'; s.descricao = 'D'; s.imagem = 'https://x.com/a.png';
const preview = buildPreview('user-teste');
assert.ok(preview.content.includes('Prévia'), 'preview rotula como previa');
assert.strictEqual(preview.embeds.length, 1);
assert.strictEqual(preview.components[0]?.components.length, 3, 'botões: voltar/enviar/cancelar');
limparSessao('user-teste');

// O Discord rejeita mensagens com ActionRow contendo mais de 5 componentes
// (DiscordAPIError 50035 BASE_TYPE_BAD_LENGTH) e no máx 5 linhas por mensagem.

const s2 = getSessao('user-rows');
s2.titulo = 'Painel';
s2.descricao = 'Teste de linhas';
for (let i = 1; i <= 6; i++) s2.botoes.push({ rotulo: `Botão ${i}`, acao: 'link', valor: 'https://exemplo.com' });
const painel = buildPainel('user-rows');
assert.ok(Array.isArray(painel.components), 'components e array');
assert.ok(painel.components.length <= 5, 'no máx 5 ActionRows por mensagem');
for (const [i, row] of painel.components.entries()) {
  assert.ok(row.components.length >=  1, `linha ${i} nao pode ser vazia`);
  assert.ok(row.components.length <=  5, `linha ${i} tem ${row.components.length} botoes (máx 5)`);
}
// Botões customizados tambem nao podem estourar o limite de linhas.

s2.botoes.push({ rotulo: 'B7', acao: 'link', valor: 'https://exemplo.com' });
s2.botoes.push({ rotulo: 'B8', acao: 'link', valor: 'https://exemplo.com' });
s2.botoes.push({ rotulo: 'B9', acao: 'link', valor: 'https://exemplo.com' });
s2.botoes.push({ rotulo: 'B10', acao: 'link', valor: 'https://exemplo.com' });
const painelCheio = buildPainel('user-rows');
assert.ok(painelCheio.components.length <= 5, `com 10 botoes customizados, no máx 5 linhas (tem ${painelCheio.components.length})`);
limparSessao('user-rows');

console.log('testes embedPainel OK');
