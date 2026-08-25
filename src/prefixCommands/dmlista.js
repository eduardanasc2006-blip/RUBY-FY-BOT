const { EmbedBuilder } = require('discord.js');
const dm = require('../utils/dmAllowed');
const { isAdmin } = require('./settaxa');

module.exports = {
  name: 'dmlista',
  description: 'Lista os usuários autorizados a usar o bot por DM (restrito a administradores)',
  usage: '!dmlista',

  async execute(message) {
    if (!message.guild || !isAdmin(message.member, message.author.id)) {
      return message.reply('🔒 Somente administradores podem usar este comando, e apenas no servidor.');
    }

    const ids = dm.listar();
    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle('Usuários autorizados na DM')
      .setDescription(
        ids.length
          ? ids.map((id) => `\`${id}\``).join('\n')
          : 'Ninguém autorizado ainda. Use `!permitir <id>` ou defina OWNER_ID no .env.'
      )
      .setFooter({ text: 'Gerencie com !permitir e !removerdm' });

    return message.reply({ embeds: [embed] });
  },
};
