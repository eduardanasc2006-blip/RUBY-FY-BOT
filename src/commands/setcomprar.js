const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const pedidoComprasStore = require('../utils/pedidoComprasStore');
const estoque = require('../utils/estoque');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setcomprar')
    .setDescription('Configura a mensagem de pagamento exibida nos pedidos (/comprar) (admin)')
    .addStringOption((option) =>
      option
        .setName('mensagem')
        .setDescription('Mensagem personalizada. Variáveis: {total}, {canal}, {pix}')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('pix')
        .setDescription('Chave PIX usada para trocar {pix} (opcional)')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('restaurar')
        .setDescription('use "sim" para voltar à mensagem padrão')
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'comprar')) {
      return interaction.reply({ content: '🔒 Somente administradores ou equipe autorizada.', flags: MessageFlags.Ephemeral });
    }

    const guildId = interaction.guildId;
    const restaurar = interaction.options.getString('restaurar');
    if (restaurar && ['sim', 'yes', '1', 'true', 'off'].includes(restaurar.toLowerCase())) {
      pedidoComprasStore.limpar(guildId);
      return interaction.reply({ content: '✅ Mensagem de compra restaurada para o padrão neste servidor.', flags: MessageFlags.Ephemeral });
    }

    const mensagem = interaction.options.getString('mensagem');
    const pix = interaction.options.getString('pix');

    if (!mensagem && !pix) {
      const conf = pedidoComprasStore.obter(guildId);
      const efetiva = pedidoComprasStore.chavePixEfetiva(guildId);
      const preview = pedidoComprasStore.mensagem(guildId, { total: 9, canalId: interaction.channelId });
      const cats = estoque.categorias(guildId).length;
      return interaction.reply({
        content:
          '📋 **Configuração de compra**\n' +
          `**Mensagem:** ${conf.mensagem ? `\n> ${conf.mensagem}` : '*padrão do bot*'}\n` +
          `**PIX:** ${efetiva ? `\`${efetiva}\`` : '*não configurado*'}${conf.pix ? ' (definido no /setcomprar)' : efetiva ? ' (extraído do comando `pix`)' : ''}\n` +
          `**Exemplo:** ${preview}\n\n` +
          'Variáveis: `{total}` valor do pedido, `{canal}` ticket atual, `{pix}` chave PIX.\n' +
          `Use \`/setcomprar mensagem:...\` para personalizar. *(${cats} categoria(s) no estoque)*`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (mensagem !== null && mensagem !== undefined) {
      if (!mensagem.trim()) {
        return interaction.reply({ content: '❌ A mensagem não pode ficar vazia.', flags: MessageFlags.Ephemeral });
      }
      pedidoComprasStore.definirMensagem(guildId, mensagem);
    }
    if (pix !== null && pix !== undefined) {
      pedidoComprasStore.definirPix(guildId, pix);
    }

    const preview = pedidoComprasStore.mensagem(guildId, { total: 9, canalId: interaction.channelId });
    return interaction.reply({
      content: `✅ Configuração de compra salva neste servidor.\n**Exemplo:** ${preview}`,
      flags: MessageFlags.Ephemeral,
    });
  },
};