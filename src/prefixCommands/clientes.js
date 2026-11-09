const { comandoPode } = require('../utils/permissions');
const { buildClientesPainel } = require('../utils/clientesPanel');

module.exports = {
  name: 'clientes',
  description: 'Lista os clientes que já compraram, com o gasto e o número de vendas (adm)',
  usage: '!clientes',

  async execute(message) {
    if (!message.guild || !comandoPode(message.member, message.author.id, 'clientes')) {
      return message.reply('🔒 Somente administradores ou equipe autorizada podem ver a lista de clientes.');
    }

    return message.reply({ ...buildClientesPainel(message.guildId, 0), allowedMentions: { repliedUser: false } });
  },
};
