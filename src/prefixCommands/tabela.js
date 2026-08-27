const { PermissionFlagsBits } = require('discord.js');
const { publishOrUpdatePanel } = require('../utils/panelStore');
const { autoDelete } = require('../utils/autoDelete');

module.exports = {
  name: 'tabela',
  description: 'Publica (ou atualiza) o painel de conversão no canal (somente administradores)',
  usage: '!tabela',

  async execute(message, args) {
    if (!message.guild) {
      return message.reply('🔒 O painel de conversão só pode ser publicado no servidor.');
    }

    const ids = (process.env.ADMIN_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const autorizado =
      message.member?.permissions.has(PermissionFlagsBits.Administrator) ||
      ids.includes(message.author.id);

    if (!autorizado) {
      return message.reply('🔒 Somente administradores podem publicar o painel de conversão.');
    }

    // Se o usuario pedir "nova", ignora a referencia antiga e publica um painel novo
    const forcarNovo = args[0] === 'nova' || args[0] === 'novo';
    const { atualizado } = await publishOrUpdatePanel(message.channel, forcarNovo);

    // Confirma um sume apos alguns segundos para nao poluir o canal
    const confirmacao = await message.reply(
      atualizado
        ? '✅ Painel de conversão **atualizado** com as taxas atuais.'
        : '✅ Painel de conversão publicado! Qualquer pessoa pode usar os botões.'
    );
    autoDelete(confirmacao, 5000);
    return;
  },
};
