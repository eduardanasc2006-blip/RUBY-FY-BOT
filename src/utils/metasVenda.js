const metasStore = require('./metasStore');
const comprasStore = require('./comprasStore');

// Avaliação das metas de cargo do servidor — compartilhada entre o fluxo de
// compra (/comprar) e o lançamento manual de venda (!venda / /venda), para os
// dois caminhos concederem cargo exatamente com a mesma regra.

// Avalia as metas do servidor contra os dados previstos do cliente (apos a venda).
// Só devolve metas cujo cargo AINDA NÃO foi conquistado pelo cliente — uma meta já
// atingida não volta como "nova conquista" em compras futuras.
function metasConquistadas(guildId, clienteId, valor, quantidade = 1) {
  const dados = comprasStore.dadosDoCliente(guildId, clienteId);
  const novasVendas = (dados.vendas || 0) + quantidade;
  const novoGasto = (dados.gasto || 0) + (valor || 0);
  const cargosJaConquistados = comprasStore.cargosDoCliente(guildId, clienteId) || [];
  const conquistadas = [];
  for (const m of metasStore.listaMetas(guildId)) {
    if (!m || !m.cargoId) continue;
    const cargoRef = m.cargoNome || `<@&${m.cargoId}>`;
    if (cargosJaConquistados.includes(cargoRef)) continue; // já tem esse cargo — ignora
    const atingiu = m.tipo === 'valor'
      ? novoGasto >= (m.meta || 0)
      : novasVendas >= (m.meta || 0);
    if (atingiu) conquistadas.push(m);
  }
  return conquistadas;
}

// Concede os cargos das metas conquistadas e manda o log de cada um.
// `clienteTag` é só para o texto do log (menção ou nome de fora do Discord).
async function concederCargosDasMetas(client, guild, guildId, clienteId, conquistadas, clienteTag = null) {
  if (!conquistadas.length) return;
  const membroAlvo = guild?.members?.cache?.get(clienteId) ||
    (await guild?.members?.fetch(clienteId).catch(() => null));
  const logComprasStore = require('./logComprasStore');
  for (const m of conquistadas) {
    try {
      if (membroAlvo) await membroAlvo.roles.add(m.cargoId);
      logComprasStore.enviar(client, guildId, {
        titulo: '🏆 Meta atingida',
        descricao: `**${m.cargoNome || `<@&${m.cargoId}>`}** concedido a ${clienteTag || `<@${clienteId}>`} (\`${clienteId}\`).`,
        cor: 0x9b59b6,
        campos: [
          { name: '🎯 Meta', value: m.tipoDescricao || m.tipo || '—', inline: true },
          { name: '🎯 Requisito', value: `${m.meta ?? ''}`, inline: true },
        ],
        timestamp: true,
      });
    } catch (e) {
      console.error('[Metas] Falha ao adicionar cargo:', e?.message || e);
    }
  }
}

module.exports = { metasConquistadas, concederCargosDasMetas };
