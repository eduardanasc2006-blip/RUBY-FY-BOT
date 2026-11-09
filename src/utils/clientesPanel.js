const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const comprasStore = require('./comprasStore');
const { formatBRL } = require('./robuxConverter');

const COR = 0xbeb6ff;
// Clientes listados por página. Cada linha vira uma linha de texto no embed,
// então cabe bastante; 10 mantém a leitura confortável no celular.
const CLIENTES_POR_PAGINA = 10;

// Painel admin: lista os clientes que já compraram, com os números (gasto e
// número de vendas), do que mais gastou para o que menos gastou.
function buildClientesPainel(guildId, pagina = 0) {
  const clientes = comprasStore.listarClientes(guildId);
  const totalPaginas = Math.max(1, Math.ceil(clientes.length / CLIENTES_POR_PAGINA));
  const paginaAtual = Math.min(Math.max(Number(pagina) || 0, 0), totalPaginas - 1);
  const inicio = paginaAtual * CLIENTES_POR_PAGINA;
  const visiveis = clientes.slice(inicio, inicio + CLIENTES_POR_PAGINA);

  const totalGasto = clientes.reduce((s, c) => s + c.gasto, 0);
  const totalVendas = clientes.reduce((s, c) => s + c.vendas, 0);

  const linhas = visiveis.map((c, i) => {
    const pos = inicio + i + 1;
    const medalha = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `#${pos}`;
    return `**${medalha}** <@${c.clienteId}> — 💰 **${formatBRL(c.gasto)}** · 🛍️ **${c.vendas}** venda(s)`;
  });

  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(totalPaginas > 1 ? `👥 CLIENTES COM COMPRAS (${paginaAtual + 1}/${totalPaginas})` : '👥 CLIENTES COM COMPRAS')
    .setDescription(linhas.length ? linhas.join('\n') : '*Nenhum cliente com compras registradas ainda.*')
    .addFields(
      { name: '👥 Clientes', value: `${clientes.length}`, inline: true },
      { name: '💰 Total gasto', value: formatBRL(totalGasto), inline: true },
      { name: '🛍️ Vendas', value: `${totalVendas}`, inline: true }
    )
    .setFooter({ text: 'Ordenado por valor gasto. Use /cliente @alguém para ver os cargos.' });

  const components = [];
  if (totalPaginas > 1) {
    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`clientes:pag:${paginaAtual - 1}`).setLabel('◀️ Anterior').setStyle(ButtonStyle.Primary).setDisabled(paginaAtual === 0),
        new ButtonBuilder().setCustomId(`clientes:pag:${paginaAtual + 1}`).setLabel('Próxima ▶️').setStyle(ButtonStyle.Primary).setDisabled(paginaAtual >= totalPaginas - 1)
      )
    );
  }

  return { embeds: [embed], components };
}

module.exports = { buildClientesPainel, CLIENTES_POR_PAGINA };
