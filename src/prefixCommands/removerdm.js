const dm = require('../utils/dmAllowed');
const { isAdmin } = require('./settaxa');

module.exports = {
  name: 'removerdm',
  description: 'Remove a autorização de um usuário usar o bot por DM (restrito a administradores)',
  usage: '!removerdm <id_do_usuario>',

  async execute(message, args) {
    if (!message.guild || !isAdmin(message.member, message.author.id)) {
      return message.reply('🔒 Somente administradores podem usar este comando, e apenas no servidor.');
    }

    const id = (args[0] || '').replace(/[<@!>]/g, '').trim();
    if (!/^\d{15,25}$/.test(id)) {
      return message.reply('❌ Use: `!removerdm <id>` — ex: `!removerdm 123456789012345678`');
    }

    if (dm.remover(id)) {
      return message.reply(`✅ Usuário \`${id}\` removido — não pode mais usar o bot por DM.`);
    }
    return message.reply(`ℹ️ O usuário \`${id}\` não estava na lista (dono/IDs do .env não podem ser removidos por comando).`);
  },
};
