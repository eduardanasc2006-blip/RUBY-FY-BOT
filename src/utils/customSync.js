const custom = require('./customCommands');

// Nomes que pertencem a comandos nativos do bot. Comandos personalizados nunca
// devem criar/editar/excluir algo com esses nomes para nao interferir no bot.
const RESERVADOS = new Set([
  'ajuda', 'backup', 'canalavisos', 'configestoque', 'configtaxa', 'criarcomando',
  'embed', 'estoque', 'gamepass', 'gerenciarcomandos', 'limpar', 'painelcategoria',
  'painelestoque', 'reais', 'robux', 'rolegive', 'settaxa', 'tabela', 'taxa',
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

  // Comando com mesmo nome ja existe: manda em branco no corpo (0 comandos) nao
  // apaga - apenas atualiza a descricao quando preciso.
  if (existente) {
    if (existente.description !== (descricao || 'Comando personalizado')) {
      return existente.edit({ description: descricao || 'Comando personalizado' });
    }
    return existente;
  }

  return client.application.commands.create({
    name: nomeLower,
    description: (descricao || 'Comando personalizado').slice(0, 100),
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