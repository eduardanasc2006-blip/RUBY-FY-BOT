const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const COR = 0xbeb6ff;

function buildSorteioPainel(guildId, uid, canaisAlvo) {
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('🎉 Sorteios')
    .setDescription([
      'Crie um sorteio e publique no servidor!',
      '',
      '➜ Clique em **✨ Criar sorteio** para começar.',
      '',
      canaisAlvo ? '➜ O sorteio será publicado em <#' + canaisAlvo + '>.' : '➜ Escolha o canal no modal de criação.',
    ].join('\n'));
  const bts = [];
   bts.push(new ButtonBuilder().setCustomId('sorteio:criar:' + guildId + ':' + uid).setLabel('✨ Criar sorteio').setStyle(ButtonStyle.Primary));
  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(bts)] };
}

module.exports = { buildSorteioPainel };