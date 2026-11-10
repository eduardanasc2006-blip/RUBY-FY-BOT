const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
const comprasStore = require('./comprasStore');
const { formatBRL } = require('./robuxConverter');
const { resumoCliente } = require('./vendaPanel');

const COR = 0xbeb6ff;
// Um select menu aceita no máximo 25 opções; usamos isso para caber o máximo de
// clientes numa página só (a maioria dos servidores cabe numa página).
const CLIENTES_POR_PAGINA = 25;

// Nome para exibir: tenta o apelido no cache do servidor; se não achar (membro
// não cacheado), cai para "Cliente XXXX". O select menu não renderiza menção.
function nomeCliente(guild, clienteId) {
  const membro = guild?.members?.cache?.get?.(clienteId);
  if (membro) return membro.displayName || membro.user?.username || `Cliente ${String(clienteId).slice(-4)}`;
  return `Cliente ${String(clienteId).slice(-4)}`;
}

function paginaValida(pagina, totalPaginas) {
  return Math.min(Math.max(Number(pagina) || 0, 0), Math.max(0, totalPaginas - 1));
}

// ----- Página 1: lista de clientes (select menu + navegação) -----
function buildListaClientes(guild, pagina = 0) {
  const guildId = guild?.id || guild;
  const clientes = comprasStore.listarClientes(guildId);
  const totalPaginas = Math.max(1, Math.ceil(clientes.length / CLIENTES_POR_PAGINA));
  const paginaAtual = paginaValida(pagina, totalPaginas);
  const inicio = paginaAtual * CLIENTES_POR_PAGINA;
  const visiveis = clientes.slice(inicio, inicio + CLIENTES_POR_PAGINA);

  const totalGasto = clientes.reduce((s, c) => s + c.gasto, 0);
  const totalVendas = clientes.reduce((s, c) => s + c.vendas, 0);

  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(totalPaginas > 1 ? `👥 CLIENTES (${paginaAtual + 1}/${totalPaginas})` : '👥 CLIENTES')
    .setDescription(
      clientes.length
        ? 'Selecione um cliente no menu abaixo para abrir a **página dele** e gerenciar.'
        : '*Nenhum cliente com compras registradas ainda.*'
    )
    .addFields(
      { name: '👥 Clientes', value: `${clientes.length}`, inline: true },
      { name: '💰 Total gasto', value: formatBRL(totalGasto), inline: true },
      { name: '🛍️ Vendas', value: `${totalVendas}`, inline: true }
    )
    .setFooter({ text: 'Ordenado por valor gasto (do maior para o menor).' });

  const components = [];
  if (visiveis.length) {
    const opcoes = visiveis.map((c, i) => {
      const pos = inicio + i + 1;
      const medalha = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `${pos}.`;
      return {
        label: `${medalha} ${nomeCliente(guild, c.clienteId)} — ${formatBRL(c.gasto)}`.slice(0, 100),
        description: `${c.vendas} venda(s)${c.cargos.length ? ` • ${c.cargos.length} cargo(s)` : ''}`.slice(0, 100),
        value: c.clienteId,
      };
    });
    components.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`clientes:sel:${paginaAtual}`)
          .setPlaceholder('👤 Selecione um cliente para ver a página dele')
          .setMinValues(1)
          .setMaxValues(1)
          .addOptions(opcoes)
      )
    );
  }

  if (totalPaginas > 1) {
    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`clientes:lista:${paginaAtual - 1}`).setLabel('◀️ Anterior').setStyle(ButtonStyle.Primary).setDisabled(paginaAtual === 0),
        new ButtonBuilder().setCustomId(`clientes:lista:${paginaAtual + 1}`).setLabel('Próxima ▶️').setStyle(ButtonStyle.Primary).setDisabled(paginaAtual >= totalPaginas - 1)
      )
    );
  }

  return { embeds: [embed], components };
}

// ----- Página 2: perfil de um cliente -----
function buildPerfilCliente(guild, clienteId, paginaVoltar = 0) {
  const guildId = guild?.id || guild;
  const resumo = resumoCliente(guildId, clienteId);
  const lista = comprasStore.listarLancamentos(guildId, clienteId);

  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('👤 PÁGINA DO CLIENTE')
    .setDescription(`Cliente: <@${clienteId}>`)
    .addFields(
      { name: '💰 Total gasto', value: formatBRL(resumo.acumulado.gasto || 0), inline: true },
      { name: '🛍️ Vendas', value: `${resumo.acumulado.vendas || 0}`, inline: true },
      { name: '🧾 Lançado manualmente', value: `${formatBRL(resumo.totalManual)} (${lista.length})`, inline: true },
      {
        name: '🏆 Cargos conquistados',
        value: resumo.cargos.length ? resumo.cargos.map((c) => `• ${c}`).join('\n') : '*Nenhum ainda.*',
      }
    );

  if (resumo.faltando.length) {
    embed.addFields({
      name: '🎯 Faltando para as próximas metas',
      value: resumo.faltando
        .map((f) => {
          const ref = f.meta.cargoNome || `<@&${f.meta.cargoId}>`;
          const falta = f.unidade === 'valor' ? formatBRL(f.restante) : `${f.restante} venda(s)`;
          return `• **${ref}** — falta ${falta}`;
        })
        .join('\n'),
    });
  }

  const components = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`clientes:gerenciar:${clienteId}:${paginaVoltar}`).setLabel('⚙️ Gerenciar cliente').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`clientes:lista:${paginaVoltar}`).setLabel('◀️ Voltar à lista').setStyle(ButtonStyle.Secondary)
    ),
  ];

  return { embeds: [embed], components };
}

// ----- Página 3: gerenciar o cliente -----
function buildGerenciarCliente(guild, clienteId, paginaVoltar = 0) {
  const guildId = guild?.id || guild;
  const lista = comprasStore.listarLancamentos(guildId, clienteId);
  const resumo = resumoCliente(guildId, clienteId);

  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('⚙️ GERENCIAR CLIENTE')
    .setDescription(
      `Cliente: <@${clienteId}>\n\n` +
      `💰 Gasto: **${formatBRL(resumo.acumulado.gasto || 0)}** · 🛍️ **${resumo.acumulado.vendas || 0}** venda(s)\n` +
      `🧾 Lançamentos manuais: **${lista.length}** (total **${formatBRL(resumo.totalManual)}**)`
    );

  const components = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`venda:listar:${clienteId}:0`).setLabel('🧾 Ver / remover lançamentos').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`clientes:perfil:${clienteId}:${paginaVoltar}`).setLabel('◀️ Voltar ao perfil').setStyle(ButtonStyle.Secondary)
    ),
  ];

  return { embeds: [embed], components };
}

module.exports = { buildListaClientes, buildPerfilCliente, buildGerenciarCliente, nomeCliente, CLIENTES_POR_PAGINA };
