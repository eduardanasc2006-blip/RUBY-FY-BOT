const custom = require('./customCommands');

// Nomes que pertencem a comandos nativos do bot. Comandos personalizados nunca
// devem criar/editar/excluir algo com esses nomes para nao interferir no bot.
const RESERVADOS = new Set([
  'ajuda', 'backup', 'canalavisos', 'configestoque', 'configtaxa', 'criarcomando',
  'embed', 'estoque', 'gamepass', 'gerenciarcomandos', 'limpar', 'painelcategoria',
  'painel', 'painelestoque', 'reais', 'robux', 'rolegive', 'settaxa', 'tabela', 'taxa',
]);

function eReservado(nome) {
  return RESERVADOS.has(String(nome || '').toLowerCase().trim());
}

// Registra (ou atualiza) um comando personalizado como slash command global no Discord.
// Sem isso o Discord nao reconhece o /nome, entao a resposta do bot nunca dispara.
async function registrarUm(client, nome, descricao) {
  const nomeLower = String(nome).toLowerCase().trim();
  if (!nomeLower || eReservado(nomeLower)) return null;

  await client.application.commands.fetch();
  const existente = client.application.commands.cache.find((c) => c.name === nomeLower);

  // Apenas Guild Install: registrar tambem como User Install faz o Discord mostrar
  // CADA comando duplicado no seletor. Contextos aceito: guild + DMs privadas.
  const opts = { integration_types: [0], contexts: [0, 1, 2] };

  // Comando com mesmo nome ja existe: atualiza descricao/instalacao se preciso.
  if (existente) {
    const descAlvo = descricao || 'Comando personalizado';
    const it = existente.integration_types || [];
    if (existente.description !== descAlvo || it.length !== 1 || it[0] !== 0) {
      return existente.edit({ description: descAlvo, ...opts });
    }
    return existente;
  }

  return client.application.commands.create({
    name: nomeLower,
    description: (descricao || 'Comando personalizado').slice(0, 100),
    ...opts,
  });
}

// Remove um comando personalizado registrado no Discord.
async function excluirUm(client, nome) {
  const nomeLower = String(nome).toLowerCase().trim();
  if (!nomeLower || eReservado(nomeLower)) return;

  await client.application.commands.fetch();
  const existente = client.application.commands.cache.find((c) => c.name === nomeLower);
  if (existente) await existente.delete();
}

// Sincroniza todos os comandos personalizados salvos no boot do bot.
// Usado no ClientReady para garantir que comandos criados antes continuam ativos.
async function registrarTodos(client) {
  const lista = Object.values(custom.listar());
  const resultados = [];
  for (const cmd of lista) {
    try {
      const c = await registrarUm(client, cmd.nome, cmd.descricao);
      resultados.push({ nome: cmd.nome, ok: !!c });
    } catch (error) {
      console.error(`[CustomSync] Falha ao registrar ${cmd.nome}:`, error?.message || error);
      resultados.push({ nome: cmd.nome, ok: false });
    }
  }
  return resultados;
}

module.exports = { registrarUm, excluirUm, registrarTodos };