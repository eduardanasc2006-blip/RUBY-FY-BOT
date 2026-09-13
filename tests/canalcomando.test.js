const assert = require('node:assert');

process.env.ADMIN_IDS = 'admin123';

const perm = require('../src/utils/permissions');
const store = require('../src/utils/canalComandoStore');
const panel = require('../src/utils/canalComandoPanel');

const guildId = 'G_CANAL';

store.resetar();

const memberAdmin = { guild: { id: guildId }, permissions: { has: () => true }, roles: { cache: [] } };
const memberNormal = { guild: { id: guildId }, permissions: { has: () => false }, roles: { cache: { some: () => false } } };

// 1. Sem restrição, qualquer canal é permitido
assert.strictEqual(perm.podeUsarNoCanal('chA', guildId, memberNormal, 'u1', 'robux').ok, true, 'sem config deve permitir');

// 2. Restringe robux ao canal chB
store.definir(guildId, 'robux', ['chB']);
assert.strictEqual(perm.podeUsarNoCanal('chA', guildId, memberNormal, 'u1', 'robux').ok, false, 'fora do canal deve bloquear');
assert.strictEqual(perm.podeUsarNoCanal('chB', guildId, memberNormal, 'u1', 'robux').ok, true, 'dentro do canal deve liberar');
assert.match(perm.podeUsarNoCanal('chA', guildId, memberNormal, 'u1', 'robux').msg, /<#chB>/, 'mensagem padrão deve citar o canal');

// 3. Admin (Administrator) nunca é bloqueado
assert.strictEqual(perm.podeUsarNoCanal('chA', guildId, memberAdmin, 'uAdmin', 'robux').ok, true, 'admin fora deve passar');

// 4. Dono (ADMIN_IDS) nunca é bloqueado
assert.strictEqual(perm.podeUsarNoCanal('chA', guildId, memberNormal, 'admin123', 'robux').ok, true, 'dono fora deve passar');

// 5. Mensagem customizada com {canais}
store.definirMensagemGlobal(guildId, '❌ Você não pode enviar comandos aqui. Faça em {canais}');
const blq = perm.podeUsarNoCanal('chA', guildId, memberNormal, 'u1', 'robux');
assert.strictEqual(blq.ok, false);
assert.match(blq.msg, /<#chB>/, 'mensagem customizada deve expandir {canais}');

// 6. Cargo com permissão do grupo passa fora do canal (configestoque = grupo estoque)
perm.setCargo(guildId, 'estoque', 'ROLE_ESTOQUE', true);
store.definir(guildId, 'configestoque', ['chB']);
const comCargo = { guild: { id: guildId }, permissions: { has: () => false }, roles: { cache: { some: (fn) => fn({ id: 'ROLE_ESTOQUE' }) } } };
assert.strictEqual(perm.podeUsarNoCanal('chA', guildId, comCargo, 'u2', 'configestoque').ok, true, 'cargo autorizado passa');

// 7. Painel principal não quebra e serializa categorias
const painel = panel.buildCanalComandoPanel(guildId, 'user1');
assert.ok(painel.embeds, 'painel principal deve ter embed');
const catJson = painel.components[0].toJSON();
assert.ok(catJson.components[0].options.length > 3, 'deve ter várias categorias');

// 8. Lista de comandos de categoria serializa
const lista = panel.buildCanalComandoLista(guildId, 'user1', 'publicos');
const listaJson = lista.components[0].toJSON();
assert.ok(listaJson.components[0].options.length <= 25, 'select de comandos <= 25');

// 9. Detalhe do comando serializa
const detalhe = panel.buildCanalComandoDetalhe(guildId, 'user1', 'robux');
assert.ok(detalhe.embeds[0].data.title.includes('robux'), 'detalhe mostra o comando');

// 10. Seleção de canais serializa com guild mock
const guildMock = {
  id: guildId,
  channels: {
    cache: {
      filter: () => ({ sort: () => ({ first: () => [] }) }),
    },
  },
};
const canaisSel = panel.buildCanalComandoCanais(guildMock, 'user1', 'robux');
assert.ok(canaisSel, 'seleção de canais não quebra');

console.log('CANALCOMANDO-OK');