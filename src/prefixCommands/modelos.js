const { buildModelosPainel } = require('../utils/modelosPainel');
const { comandoPode } = require('../utils/permissions');

module.exports = {
  name: 'modelos',
  description: 'Abre o painel de modelos de embed (admin)',
  usage: '!modelos',

  async execute(message) {
    if (!message.guild || !comandoPode(message.member, message.author.id, 'embed')) {
      return message.reply('🔒 Somente administradores podem usar este comando.');
    }

    const painel = buildModelosPainel(message.guild.id, message.author.id);
    return message.reply({
      embeds: painel.embeds,
      components: painel.components,
    });
  },
};