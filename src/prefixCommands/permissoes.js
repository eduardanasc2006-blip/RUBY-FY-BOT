const { isAdmin } = require('./settaxa');
const { eDono } = require('../utils/permissions');
const { buildPermissionsPanel } = require('../utils/permissionsPanel');

module.exports = {
  name: 'permissoes',
  description: 'Gerencia permissões por cargo nos grupos de comandos (restrito a administradores)',
  usage: '!permissoes',

  async execute(message) {
    const admin = isAdmin(message.member, message.author.id) || eDono(message.author.id);
    if (!message.guild || !admin) {
      return message.reply('🔒 Somente administradores podem gerenciar permissões.');
    }
    return message.reply({
      ...buildPermissionsPanel(message.guild, message.author.id),
      allowedMentions: { repliedUser: false },
    });
  },
};