const assert = require('node:assert');
const { buildConteudoPrivado } = require('../src/utils/embedPainel');

// Conteudo privado deve enviar TODAS as embeds em sequencia numa unica
// resposta efemera - sem paginacao, sem "Pagina X", sem botoes de navegacao.


const paginas = [
  { titulo: 'Vendas', descricao: 'Nao e permitida a venda entre membros nao autorizados...', imagem: null, thumbnail: null, fields: [] },
  { titulo: 'Chats', descricao: 'Nao e permitido spam...', imagem: null, thumbnail: null, fields: [{ name: 'Regra', value: '1', inline: true }] },
  { titulo: 'Respeito', descricao: 'E obrigatorio manter o respeito...', imagem: 'https://exemplo.com/r.png', thumbnail: null, fields: [] },
];

const resposta = buildConteudoPrivado(paginas, 0, '', 'guild-teste', 'token-teste');

assert.strictEqual(resposta.flags,1 <<  6,'resposta deve ser efemera');
assert.strictEqual(resposta.embeds.length,3,'todas as embeds devem vir juntas');
assert.strictEqual(resposta.embeds[0].data.title,'Vendas','ordem preservada: primeira embed');
assert.strictEqual(resposta.embeds[1].data.title,'Chats','ordem preservada: segunda embed');
assert.strictEqual(resposta.embeds[2].data.title,'Respeito','ordem preservada: terceira embed');
assert.strictEqual(resposta.embeds[1].data.fields.length,1,'campos da embed preservados');
assert.strictEqual(resposta.embeds[2].data.image.url,'https://exemplo.com/r.png','imagem preservada');
assert.ok(!JSON.stringify(resposta).includes('Pagina'),'nao deve haver rotulo de pagina');
assert.ok(!JSON.stringify(resposta).includes(':pag:'),'nao deve haver botao de paginacao');
assert.ok(!JSON.stringify(resposta).includes('Fechar'),'nao deve haver botao de fechar');
assert.ok(!JSON.stringify(resposta).includes('Voltar'),'nao deve haver botao de voltar');

const vazio = buildConteudoPrivado([],0, '', 'guild-teste', 'token-teste');
assert.strictEqual(vazio.flags,1 <<  6,'resposta vazia tambem e efemera');
assert.strictEqual(vazio.embeds.length,0);
assert.ok(vazio.content.length > 0,'deve haver aviso de conteudo vazio');

const dono = buildConteudoPrivado(paginas,0, 'autor-1', 'guild-teste', 'token-teste');
assert.strictEqual(dono.components.length,1,'dono recebe uma ActionRow com o botao de editar');
assert.strictEqual(dono.components[0].components.length,1);
assert.ok(dono.components[0].components[0].data.custom_id.includes(':editar:autor-1'),'botao de editar conteudos para o dono');
assert.ok(!JSON.stringify(dono).includes(':pag:'),'mesmo com dono nao ha paginacao');

const visitante = buildConteudoPrivado(paginas,0, '', 'guild-teste', 'token-teste');
assert.strictEqual(visitante.components.length,0,'visitante nao recebe botoes');

console.log('testes conteudoPrivado OK');