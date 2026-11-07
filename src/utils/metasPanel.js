const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');
const metasStore = require('./metasStore');

const COR = 0xbeb6ff;

// Cada meta ocupa 2 botões (editar + excluir) e o Discord aceita no máximo 5
// botões por linha / 5 ActionRows por mensagem. Por isso são 2 metas por linha
// (4 botões) e a lista é paginada — senão o painel montava uma ActionRow com 8
// botões e o /metas respondia "Ocorreu um erro ao executar este comando"
// (DiscordAPIError 50035 BASE_TYPE_BAD_LENGTH).
// 6 por página = 3 linhas de metas + 1 de cabeçalho + 1 de navegação = 5 ActionRows.
const METAS_POR_PAGINA = 6;

const btn = (id, label, style, emoji) => {
  const b = new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style || ButtonStyle.Secondary);
  if (emoji) b.setEmoji(emoji);
  return b;
};

function linhaCom(...botoes) {
  const linha = new ActionRowBuilder();
  linha.addComponents(...botoes);
  return linha;
}

// ----- Painel principal: lista as metas configuradas (paginado) -----
function buildMetasPainel(guild, userId, pagina = 0) {
  const metas = metasStore.listaMetas(guild?.id || guild);

  const totalPaginas = Math.max(1, Math.ceil(metas.length / METAS_POR_PAGINA));
  const paginaAtual = Math.min(Math.max(Number(pagina) || 0, 0), totalPaginas - 1);
  const inicio = paginaAtual * METAS_POR_PAGINA;
  const visiveis = metas.slice(inicio, inicio + METAS_POR_PAGINA);

  const linhasTexto = metas.map((m) => {
    const tipo = m.tipo === 'valor' ? '💰 Valor total gasto' : '🛍️ Quantidade de vendas';
    const metaTxt = m.tipo === 'valor' ? `R$ ${Number(m.meta).toFixed(2)}` : `${m.meta} venda(s)`;
    return `• **${m.cargoNome || `<@&${m.cargoId}>`}** — ${tipo}: ${metaTxt}`;
  });

  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(totalPaginas > 1 ? `🎯 Metas de Cargos (${paginaAtual + 1}/${totalPaginas})` : '🎯 Metas de Cargos')
    .setDescription(
      'Configure **metas** que concedem cargos automaticamente quando o cliente atinge.\n' +
      'Os cargos são **acumulativos**: o cliente mantém todos os cargos que já conquistou.\n\n' +
      (linhasTexto.length ? linhasTexto.join('\n') : '*Nenhuma meta configurada ainda.*')
    );

  const linhas = [];
  linhas.push(linhaCom(
    btn(`metaspainel:add:${userId}`, 'Adicionar meta', ButtonStyle.Primary, '➕'),
    btn(`metaspainel:cancel:${userId}`, 'Fechar', ButtonStyle.Secondary)
  ));

  for (let i = 0; i < visiveis.length; i += 2) {
    const par = visiveis.slice(i, i + 2);
    linhas.push(linhaCom(...par.flatMap((m) => [
      btn(`metaspainel:edit:${m.id}:${userId}`, `✏️ ${m.cargoNome || m.cargoId}`, ButtonStyle.Secondary),
      btn(`metaspainel:rm:${m.id}:${userId}`, '🗑️', ButtonStyle.Danger),
    ])));
  }

  if (totalPaginas > 1) {
    linhas.push(linhaCom(
      btn(`metaspainel:pag:${paginaAtual - 1}:${userId}`, '◀️ Anterior', ButtonStyle.Primary).setDisabled(paginaAtual === 0),
      btn(`metaspainel:pag:${paginaAtual + 1}:${userId}`, 'Próxima ▶️', ButtonStyle.Primary).setDisabled(paginaAtual >= totalPaginas - 1)
    ));
  }

  return {
    embeds: [embed],
    components: linhas,
  };
}

// ----- Tela para selecionar o cargo (adicionar/editar meta) -----
function telaEscolherCargo(guild, userId, acao, metaId, cargoIdAtual) {
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(acao === 'edit' ? '✏️ Editar meta — escolha o cargo' : '➕ Nova meta — escolha o cargo')
    .setDescription('Selecione o cargo que o cliente conquista ao atingir esta meta:');
   const sel = new RoleSelectMenuBuilder()
     .setCustomId(`metaspainel:role:${acao}:${metaId || ''}:${userId}`)
     .setPlaceholder('🏷️ Selecione o cargo')
     .setMinValues(1)
     .setMaxValues(1);
   if (cargoIdAtual) {
     sel.setDefaultValues([{ id: cargoIdAtual, type: 'role' }]);
   }
   return {
     embeds: [embed],
     components: [
       linhaCom(sel),
       linhaCom(btn(`metaspainel:cancel:${userId}`, '⬅️ Voltar', ButtonStyle.Secondary)),
     ],
   };
}

// ----- Tela para escolher o tipo de requisito -----
function telaEscolherTipo(guild, userId, acao, metaId, roleId, roleNome) {
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(acao === 'edit' ? '✏️ Editar meta' : '➕ Nova meta')
    .setDescription(`Cargo: **${roleNome || `<@&${roleId}>`}**\n\nAgora escolha o **tipo de requisito**:`);
   const sel = new StringSelectMenuBuilder()
     .setCustomId(`metaspainel:tipo:${acao}:${metaId || ''}:${roleId}:${userId}`)
     .setPlaceholder('📊 Tipo de requisito')
     .setMinValues(1)
     .setMaxValues(1)
     .addOptions([
       { label: '🛍️ Quantidade de vendas', value: 'vendas' },
       { label: '💰 Valor total gasto', value: 'valor' },
     ]);
   return {
     embeds: [embed],
     components: [
       linhaCom(sel),
       linhaCom(btn(`metaspainel:cancel:${userId}`, '⬅️ Voltar', ButtonStyle.Secondary)),
     ],
   };
}

module.exports = { buildMetasPainel, telaEscolherCargo, telaEscolherTipo, linhaCom, btn };