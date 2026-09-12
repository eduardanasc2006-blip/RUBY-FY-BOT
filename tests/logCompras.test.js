const assert = require('node:assert');
const { montarEmbeds } = require('../src/utils/logComprasStore');

// Cor/estrutura: grupos dividem os campos em multiplas embeds,
// mantendo titulo/descricao/timestamp apenas na primeira.
const embeds = montarEmbeds({
  titulo: '📥 Pedido criado',
  descricao: '**#1** aguardando confirmação do pagamento.',
  cor: 0xf1c40f,
  grupos: [
    [
      { name: '👤 Cliente', value: 'finix.yin (`123456`)', inline: true },
      { name: '📦 Item', value: 'Testando', inline: true },
      { name: '🔢 Quantidade', value: '1', inline: true },
    ],
    [
      { name: '💰 Valor', value: 'R$ 3,00', inline: true },
      { name: '⏳ Status', value: 'Aguardando confirmação do pagamento', inline: true },
    ],
  ],
  timestamp: true,
});

assert.strictEqual(embeds.length, 2, 'grupos viram embeds separadas');
assert.strictEqual(embeds[0].data.title, '📥 Pedido criado', 'titulo fica na primeira embed');
assert.strictEqual(embeds[0].data.description, '**#1** aguardando confirmação do pagamento.', 'descricao fica na primeira embed');
assert.strictEqual(embeds[0].data.color, 0xf1c40f, 'aplica a cor na primeira embed');
assert.strictEqual(embeds[0].data.fields.length, 3, '1º grupo de campos na primeira embed');
assert.strictEqual(embeds[1].data.fields.length, 2, '2º grupo vira embed separada');
assert.strictEqual(embeds[1].data.title, undefined, 'embeds seguintes nao repetem titulo');
assert.ok(!embeds[1].data.timestamp || embeds[1].data.timestamp, 'timestamp presente na primeira embed');
assert.strictEqual(embeds[0].data.fields[0].value, 'finix.yin (`123456`)', 'campo Cliente carrega tag + ID');

// Sem grupos, mantem comportamento antigo: apenas 1 embed com todos os campos.
const antigo = montarEmbeds({
  titulo: '🏆 Meta atingida',
  descricao: 'cargo concedido.',
  cor: 0x9b59b6,
  campos: [
    { name: '🎯 Meta', value: '5 vendas', inline: true },
    { name: '🎯 Requisito', value: '5', inline: true },
  ],
  timestamp: false,
});
assert.strictEqual(antigo.length, 1, 'sem grupos continua uma embed unica');
assert.strictEqual(antigo[0].data.fields.length, 2, 'todos os campos preservados');
assert.strictEqual(antigo[0].data.title, '🏆 Meta atingida', 'titulo preservado');
assert.strictEqual(antigo[0].data.description, 'cargo concedido.', 'descricao preservada');

// Sem campos nem grupos: embed apenas com titulo/descricao.
const vazio = montarEmbeds({ titulo: 'Teste', descricao: 'Sem campos' });
assert.strictEqual(vazio.length, 1, 'sem campos nem grupos gera 1 embed');
assert.ok(!vazio[0].data.fields || vazio[0].data.fields.length === 0, 'sem campos');

console.log('testes logCompras OK');