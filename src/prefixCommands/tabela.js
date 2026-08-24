const { PermissionFlagsBits } = require('discord.js');
const { publishOrUpdatePanel } = require('../utils/panelStore');

module.exports = {
  name: 'tabela',
  description: 'Publica (ou atualiza) o painel de conversão no canal (somente administradores)',
  usage: '!tabela',

  async execute(message) {
    const ids = (process.env.ADMIN_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const autorizado =
      message.member?.permissions.has(PermissionFlagsBits.Administrator) ||
      ids.includes(message.author.id);

    if (!autorizado) {
      return message.reply('🔒 Somente administradores podem publicar o painel de conversão.');
    }

    const { atualizado } = await publishOrUpdatePanel(message.channel);

    return message.reply(
      atualizado
        ? '✅ Painel de conversão **atualizado** com as taxas atuais.'
        : '✅ Painel de conversão publicado! Qualquer pessoa pode usar os botões.'
    );
  },
};
