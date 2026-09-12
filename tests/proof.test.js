const assert = require('node:assert');
const proofStore = require('../src/utils/proofStore');
const estoque = require('../src/utils/estoque');
const { buildProofModal, buildProofFormulario, modalClientePlataforma, opcoesProdutos } = require('../src/utils/proofModal');

// Testa config de canal de proofs (define/obter/desativar) de forma isolada.
// No teste real, o cliente usa /proof link:... e o bot publica no canal.

const GUILD = 'g-proof-teste';

try {
  assert.strictEqual(proofStore.obter(GUILD), null, 'guild sem canal de proof começa nula');

  proofStore.definir(GUILD, '123456789');
  assert.strictEqual(proofStore.obter(GUILD), '123456789', 'definir canal de proofs');

  proofStore.definir(GUILD, '987654321');
  assert.strictEqual(proofStore.obter(GUILD), '987654321', 'atualizar canal de proofs');

  proofStore.desativar(GUILD);
  assert.strictEqual(proofStore.obter(GUILD), null, 'desativar canal de proofs');

  // Definir com guildId inválido não quebra
  proofStore.definir('', 'x');
  assert.strictEqual(proofStore.obter(''), null, 'guildId vazio não guarda');

  // Rascunho (imagens aguardando o modal)
  proofStore.salvarRascunho('u-teste', { urls: ['https://x/1.png'], nomes: ['1.png'], canalPadrao: '987654321' });
  const r = proofStore.obterRascunho('u-teste');
  assert.ok(r && r.urls.length === 1, 'rascunho salvo com urls');
  assert.strictEqual(r.canalPadrao, '987654321', 'rascunho guarda canalPadrao');
  proofStore.limparRascunho('u-teste');
  assert.strictEqual(proofStore.obterRascunho('u-teste'), null, 'rascunho limpo');

  // buildProofModal monta modal com 3 campos de texto (canal/cliente viraram selects)
  proofStore.definir(GUILD, '987654321');
  const modalJson = buildProofModal(GUILD, { numero: '30', produto: 'Testando' }).toJSON();
  assert.strictEqual(modalJson.custom_id, 'proofmodal', 'customId do modal');
  assert.strictEqual(modalJson.components.length, 3, '3 inputs no modal');
  const numeroInput = modalJson.components[0].components[0];
  assert.strictEqual(numeroInput.value, '30', 'numero pré-preenchido');

  // buildProofFormulario monta o painel com selects de canal+cliente+produto e botão
  // Cria um produto de teste para o seletor aparecer (só leitura, não altera estoque)
  const catTeste = estoque.addCategoria(GUILD, 'Categoria Proof Teste');
  const prodTeste = estoque.addProduto(GUILD, catTeste.id, { nome: 'Produto Prova', valor: 7.5, controlarQtd: true, quantidade: 3 });
  const painel = buildProofFormulario('u-teste', { id: GUILD, members: { cache: new Map() } }, { numero: 30, produto: 'X', valor: '3,00', clienteId: null, canalId: null });
  assert.ok(painel.embeds.length === 1, 'painel com embed');
  const customIds = painel.components.flatMap((r) => r.components.map((c) => c.data.custom_id));
  assert.ok(customIds.includes('proofsel:canal'), 'select de canal');
  assert.ok(customIds.includes('proofsel:cliente'), 'select de cliente');
  assert.ok(customIds.includes('proofsel:plataforma'), 'botão Fora do Discord');
  assert.ok(customIds.includes('proofsel:produto'), 'select de produto (com estoque)');
  assert.ok(customIds.includes('proofsel:confirmar'), 'botão confirmar');

  // Cliente por plataforma externa (Instagram, TikTok...) — aparece só o nome, sem ID
  const painelPlataforma = buildProofFormulario(
    'u-teste',
    { id: GUILD, members: { cache: new Map() } },
    { numero: 30, produto: 'X', valor: '3,00', clienteId: null, clienteNome: 'Instagram' }
  );
  const descPlataforma = painelPlataforma.embeds[0].data.description;
  assert.ok(descPlataforma.includes('👤 Cliente: Instagram'), 'cliente da plataforma aparece como nome');
  assert.ok(!descPlataforma.includes('🆔 ID'), 'plataforma não exibe ID numérico');

  // Painel com cliente Discord exibe menção + ID
  const painelDiscord = buildProofFormulario(
    'u-teste',
    { id: GUILD, members: { cache: new Map() } },
    { numero: 30, produto: 'X', valor: '3,00', clienteId: '111111111111111', clienteNome: null }
  );
  const descDiscord = painelDiscord.embeds[0].data.description;
  assert.ok(descDiscord.includes('👤 Cliente: <@111111111111111>'), 'cliente do Discord vira menção');
  assert.ok(descDiscord.includes('🆔 ID: `111111111111111`'), 'ID aparece para cliente do Discord');

  // Modal 'Fora do Discord' tem o campo certo
  const modalPlataforma = modalClientePlataforma('TikTok').toJSON();
  assert.strictEqual(modalPlataforma.custom_id, 'proofsel:plataformamodal', 'customId do modal de plataforma');
  assert.strictEqual(modalPlataforma.components[0].components[0].custom_id, 'clienteNome', 'campo do nome da plataforma');
  assert.strictEqual(modalPlataforma.components[0].components[0].value, 'TikTok', 'pré-preenche valor atual');

  // O seletor de produto NÃO altera o estoque — existência/quantidade preservada
  const prodsel = painel.components.find((r) => r.components[0].data.custom_id === 'proofsel:produto');
  const menu = prodsel.components[0];
  const op0 = menu.options[0];
  assert.strictEqual(menu.options.length, 1, 'uma opção de produto');
  assert.strictEqual(op0.data.label, 'Produto Prova', 'opção com o nome do produto');
  assert.strictEqual(op0.data.value, prodTeste.id, 'value do produto é o id');
  assert.strictEqual(op0.data.description, 'R$ 7,50', 'descrição com valor formatado');
  const depois = estoque.produto(GUILD, catTeste.id, prodTeste.id);
  assert.strictEqual(depois.quantidade, 3, 'montar opções NÃO diminui o estoque');
  assert.strictEqual(depois.ativo, true, 'montar opções NÃO altera o estado');
  // opcoesProdutos exportada também funciona
  assert.strictEqual(opcoesProdutos(GUILD)[0].label, 'Produto Prova', 'opcoesProdutos direta');

  console.log('testes proof OK');
} finally {
  // limpa estoque temporário do teste
  estoque.removeCategoria(GUILD, 'categoria-proof-teste');
  const fs = require('node:fs');
  const path = require('node:path');
  const arquivo = path.join(__dirname, '..', 'data', 'estoque', `${GUILD}.json`);
  try { fs.unlinkSync(arquivo); } catch {}
  proofStore.desativar(GUILD);
}