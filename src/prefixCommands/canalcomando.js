const { isAdmin } = require('./settaxa');
const { eDono } = require('../utils/permissions');
const { buildCanalComandoPanel } = require('../utils/canalComandoPanel');

module.exports = {
  name: 'canalcomando',
  description: 'Configura em quais canais cada comando pode ser usado (restrito a administradores)',
  usage: '!canalcomando',

  async execute(message) {
    if (!message.guild) {
      return message.reply('🔒 Isso só funciona no servidor.');
    }
    const admin = isAdmin(message.member, message.author.id) || eDono(message.author.id);
    if (!admin) {
      return message.reply('🔒 Somente administradores podem configurar canais de comandos.');
    }
    return message.reply({
      ...buildCanalComandoPanel(message.guildId, message.author.id),
      allowedMentions: { repliedUser: false },
    });
  },
};