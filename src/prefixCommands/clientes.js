const { comandoPode } = require('../utils/permissions');
const { buildListaClientes } = require('../utils/clientesPanel');

module.exports = {
  name: 'clientes',
  description: 'Painel de clientes: veja e gerencie quem já comprou (adm)',
  usage: '!clientes',

  async execute(message) {
    if (!message.guild || !comandoPode(message.member, message.author.id, 'clientes')) {
      return message.reply('🔒 Somente administradores ou equipe autorizada podem ver o painel de clientes.');
    }

    return message.reply({ ...buildListaClientes(message.guild, 0), allowedMentions: { repliedUser: false } });
  },
};
