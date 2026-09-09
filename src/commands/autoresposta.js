const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const { painelCentral, modalAdicionar } = require('../utils/autoRespostaPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autoresposta')
    .setDescription('Gerencia respostas automaticas por palavra-chave (admin)')
    .addStringOption((o) => o.setName('palavra').setDescription('Palavra/gatilho que dispara (opcional; abre o modal pre-preenchido)').setRequired(false).setMaxLength(32))
    .addStringOption((o) => o.setName('resposta').setDescription('Mensagem de resposta (opcional)').setRequired(false).setMaxLength(4000))
    .addStringOption((o) => o.setName('canais').setDescription('IDs de canais separados por virgula (opcional)').setRequired(false)),
  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'autoresposta')) {

      return interaction.reply({ content: '🔒 Somente administradores podem usar este comando.', flags: MessageFlags.Ephemeral });
    }

    const palavra = (interaction.options.getString('palavra') || '').trim();
    const resposta = (interaction.options.getString('resposta') || '').trim();
    const canaisBruto = (interaction.options.getString('canais') || '').trim();
    if (palavra || resposta || canaisBruto){ 
      const modal = modalAdicionar(true, { palavra, resposta, canais: canaisBruto });
      return interaction.showModal(modal);
    }

    const menu = painelCentral(interaction.guildId, interaction.guild);
    if (!menu.components.length) return interaction.reply({ content: menu.content, flags: MessageFlags.Ephemeral });
    return interaction.reply({ content: menu.content, components: menu.components, flags: MessageFlags.Ephemeral });
  },
};
