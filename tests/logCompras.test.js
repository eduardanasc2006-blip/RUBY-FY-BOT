const assert = require('node:assert');
const { montarEmbeds } = require('../src/utils/logComprasStore');

// Formato padrão: UMA embed única enxuta, todos os campos inline,
// mantendo título/descrição/timestamp.
const embeds = montarEmbeds({
  titulo: '📥 Pedido criado',
  descricao: '**#1** aguardando confirmação do pagamento.',
  cor: 0xf1c40f,
  campos: [
    { name: '👤 Cliente', value: 'finix.yin (`123456`)', inline: true },
    { name: '📦 Item', value: 'Testando', inline: true },
    { name: '🔢 Quantidade', value: '1', inline: true },
    { name: '💰 Valor', value: 'R$ 3,00', inline: true },
    { name: '⏳ Status', value: 'Aguardando confirmação do pagamento', inline: true },
  ],
  timestamp: true,
});

assert.strictEqual(embeds.length, 1, 'campos geram UMA embed unica (nao ocupa espaco extra)');
assert.strictEqual(embeds[0].data.title, '📥 Pedido criado', 'titulo na embed');
assert.strictEqual(embeds[0].data.description, '**#1** aguardando confirmação do pagamento.', 'descricao na embed');
assert.strictEqual(embeds[0].data.color, 0xf1c40f, 'aplica a cor');
assert.strictEqual(embeds[0].data.fields.length, 5, 'todos os campos preservados');
assert.strictEqual(embeds[0].data.fields[0].value, 'finix.yin (`123456`)', 'campo Cliente carrega tag + ID');

// Compatibilidade: `grupos` ainda continua funcionando (caso já tenha sido usado).
const grupos = montarEmbeds({
  titulo: 'Teste grupos',
  grupos: [
    [{ name: 'A', value: '1', inline: true }],
    [{ name: 'B', value: '2', inline: true }],
  ],
});
assert.strictEqual(grupos.length, 2, 'grupos ainda geram mais de uma embed (legado)');

// Sem campos nem grupos: embed apenas com titulo/descricao.
const vazio = montarEmbeds({ titulo: 'Teste', descricao: 'Sem campos' });
assert.strictEqual(vazio.length, 1, 'sem campos nem grupos gera 1 embed');
assert.ok(!vazio[0].data.fields || vazio[0].data.fields.length === 0, 'sem campos');

console.log('testes logCompras OK');