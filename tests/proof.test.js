const assert = require('node:assert');
const proofStore = require('../src/utils/proofStore');
const { buildProofModal, buildProofFormulario } = require('../src/utils/proofModal');

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

  // buildProofFormulario monta o painel com selects de canal+cliente e botão
  const painel = buildProofFormulario('u-teste', { id: 'g', members: { cache: new Map() } }, { numero: 30, produto: 'X', valor: '3,00', clienteId: null, canalId: null });
  assert.ok(painel.embeds.length === 1, 'painel com embed');
  const customIds = painel.components.flatMap((r) => r.components.map((c) => c.data.custom_id));
  assert.ok(customIds.includes('proofsel:canal'), 'select de canal');
  assert.ok(customIds.includes('proofsel:cliente'), 'select de cliente');
  assert.ok(customIds.includes('proofsel:confirmar'), 'botão confirmar');

  console.log('testes proof OK');
} finally {
  proofStore.desativar(GUILD);
}