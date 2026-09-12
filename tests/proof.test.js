const assert = require('node:assert');
const proofStore = require('../src/utils/proofStore');

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

  console.log('testes proof OK');
} finally {
  proofStore.desativar(GUILD);
}