const assert = require('node:assert');
const { buildResposta } = require('../src/utils/customCommandsPanel');

const base = {
  nome: 'Pix',
  mensagem: 'Mensagem de resposta',
  embed: { titulo: 'Pagamento via PIX', descricao: 'Descrição', cor: null, imagem: null, fields: [] },
  copiaveis: [],
  ephemeral: false,
};

// Título preenchido → usado como título da embed
const r1 = buildResposta({ ...base });
assert.strictEqual(r1.embeds[0].data.title, 'Pagamento via PIX', 'titulo preenchido deve ser o titulo da embed');

// Título vazio → embed SEM titulo (e o nome NAO vira titulo)
const semTitulo = buildResposta({ ...base, embed: { ...base.embed, titulo: null } });
assert.strictEqual(semTitulo.embeds[0].data.title, undefined, 'nome nao deve virar titulo da embed');
assert.strictEqual(semTitulo.embeds[0].data.description, 'Mensagem de resposta', 'mensagem continua como descricao');

// Sem embed nenhum → embed sem titulo (somente descricao com a mensagem)
const semEmbed = buildResposta({ nome: 'Pix', mensagem: 'Oi', embed: null, copiaveis: [], ephemeral: false });
assert.strictEqual(semEmbed.embeds[0].data.title, undefined, 'sem embed, a embed nao deve ter titulo');
assert.strictEqual(semEmbed.embeds[0].data.description, 'Oi');

// Nome nunca deve aparecer como titulo da embed, mesmo com embed vazio
const r4 = buildResposta({ ...base, embed: { titulo: '', descricao: '', cor: null, imagem: null, fields: [] } });
assert.strictEqual(r4.embeds[0].data.title, undefined, 'titulo vazio nao deve cair para o nome');

console.log('testes customTitulo OK');