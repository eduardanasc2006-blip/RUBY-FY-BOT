const dm = require('../utils/dmAllowed');
const { isAdmin } = require('./settaxa');

module.exports = {
  name: 'permitir',
  description: 'Autoriza um usuário a usar o bot por DM (restrito a administradores)',
  usage: '!permitir <id_do_usuario>',

  async execute(message, args) {
    if (!message.guild || !isAdmin(message.member, message.author.id)) {
      return message.reply('🔒 Somente administradores podem usar este comando, e apenas no servidor.');
    }

    const id = (args[0] || '').replace(/[<@!>]/g, '').trim();
    if (!/^\d{15,25}$/.test(id)) {
      return message.reply('❌ Use: `!permitir <id>` — ex: `!permitir 123456789012345678` (ative o Modo Desenvolvedor para copiar o ID)');
    }

    if (dm.adicionar(id)) {
      return message.reply(`✅ Usuário \`${id}\` autorizado a usar o bot por DM.`);
    }
    return message.reply(`ℹ️ O usuário \`${id}\` já estava autorizado.`);
  },
};
