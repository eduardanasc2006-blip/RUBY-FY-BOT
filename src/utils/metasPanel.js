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

// ----- Painel principal: lista as metas configuradas -----
function buildMetasPainel(guild, userId) {
  const metas = metasStore.listaMetas(guild?.id || guild);
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('🎯 Metas de Cargos')
    .setDescription(
      'Configure **metas** que concedem cargos automaticamente quando o cliente atinge.\n' +
      'Os cargos são **acumulativos**: o cliente mantém todos os cargos que já conquistou.\n\n' +
      (metas.length
        ? metas.map((m) => {
            const tipo = m.tipo === 'valor' ? '💰 Valor total gasto' : '🛍️ Quantidade de vendas';
            const metaTxt = m.tipo === 'valor' ? `R$ ${Number(m.meta).toFixed(2)}` : `${m.meta} venda(s)`;
            return `• **${m.cargoNome || `<@&${m.cargoId}>`}** — ${tipo}: ${metaTxt}`;
          }).join('\n')
        : '*Nenhuma meta configurada ainda.*')
    );

  const linhas = [];
  linhas.push(linhaCom(
    btn(`metaspainel:add:${userId}`, 'Adicionar meta', ButtonStyle.Primary, '➕'),
    btn(`metaspainel:cancel:${userId}`, 'Fechar', ButtonStyle.Secondary)
  ));

  let contador = 0;
  for (const m of metas) {
    if (contador % 4 === 0) linhas.push(new ActionRowBuilder());
    linhas[linhas.length -1].addComponents(
      btn(`metaspainel:edit:${m.id}:${userId}`, `✏️ ${m.cargoNome || m.cargoId}`, ButtonStyle.Secondary),
      btn(`metaspainel:rm:${m.id}:${userId}`, '🗑️', ButtonStyle.Danger)
    );
    contador++;
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