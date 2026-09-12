const assert = require('node:assert');
const proofStore = require('../src/utils/proofStore');
const { buildProofModal } = require('../src/utils/proofModal');

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

  // buildProofModal monta modal com 5 campos e canal pré-preenchido pelo config
  proofStore.definir(GUILD, '987654321');
  const modalJson = buildProofModal(GUILD, { numero: '30', cliente: '@teste' }).toJSON();
  assert.strictEqual(modalJson.custom_id, 'proofmodal', 'customId do modal');
  assert.strictEqual(modalJson.components.length, 5, '5 inputs no modal');
  const canalInput = modalJson.components[4].components[0];
  assert.ok(canalInput.placeholder.includes('987654321'), 'placeholder do canal usa o config');
  const numeroInput = modalJson.components[0].components[0];
  assert.strictEqual(numeroInput.value, '30', 'numero pré-preenchido');

  console.log('testes proof OK');
} finally {
  proofStore.desativar(GUILD);
}