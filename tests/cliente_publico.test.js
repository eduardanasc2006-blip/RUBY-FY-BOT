const assert = require('node:assert');
const cliente = require('../src/commands/cliente');
const comprasStore = require('../src/utils/comprasStore');

// O perfil de cliente tem que ser PUBLICO (visivel para todos no canal).
// Antes a resposta usava flags Ephemeral e so quem rodava o comando via.

const GUILD = 'g-cliente-teste';
const ALVO = '222222222222222222';

let capturado = null;
const interacao = {
  guild: { id: GUILD },
  guildId: GUILD,
  user: { id: '111111111111111111', username: 'admin' },
  options: { getUser: () => ({ id: ALVO }) },
  reply: async (payload) => { capturado = payload; },
};

(async () => {
  comprasStore.registrarVenda(GUILD, ALVO, 250, ['💎 Cliente VIP']);

  await cliente.execute(interacao);

  assert.ok(capturado, 'o comando respondeu');
  assert.ok(capturado.embeds && capturado.embeds.length === 1, 'respondeu com 1 embed');

  const embed = capturado.embeds[0].toJSON();
  assert.ok(embed.description.includes(ALVO), 'embed cita o cliente consultado');
  assert.ok(embed.description.includes('Cliente VIP'), 'embed lista o cargo conquistado');

  // O ponto do teste: sem flag Ephemeral -> mensagem publica.
  assert.ok(
    capturado.flags === undefined,
    `resposta do /cliente deve ser publica, mas veio flags=${capturado.flags}`,
  );

  // Consultar outro usuario tambem e publico e nao vaza dados de terceiros.
  capturado = null;
  await cliente.execute({ ...interacao, user: { id: '999999999999999999' } });
  assert.ok(capturado && capturado.flags === undefined, 'consulta de outro usuario tambem publica');

  // Fora de servidor continua privado e avisa.
  capturado = null;
  await cliente.execute({ ...interacao, guild: null, guildId: null });
  assert.ok(capturado && capturado.content.includes('servidor'), 'fora de guild responde com aviso');

  console.log('✅ cliente_publico: perfil visivel para todos');
})();
