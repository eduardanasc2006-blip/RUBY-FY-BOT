const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const { isAdmin } = require('../prefixCommands/settaxa');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('limpar')
    .setDescription('Apaga mensagens do canal (admin)')
    .addIntegerOption((option) =>
      option
        .setName('quantidade')
        .setDescription('Quantas mensagens apagar (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),

  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'limpar')) {
      return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
    }

    const qtd = interaction.options.getInteger('quantidade');
    const MAIOR_QUE_14_DIAS = 14 * 24 * 60 * 60 * 1000;

    // Defer para se o canal tiver muitas mensagens e a busca demorar um pouco
    await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});

    try {
      const apagadas = await interaction.channel.bulkDelete(qtd, true);
      return interaction.editReply(`🧹 ${apagadas.size} mensagens apagadas.`);
    } catch {
      // Mensagens com mais de 14 dias quebram o bulkDelete inteiro. Busca as
      // mensagens e apaga em lotes apenas as recentes (menores que 14 dias).
      try {
        const mensagens = await interaction.channel.messages.fetch({ limit: Math.min(qtd + 1, 100) });
        const apagaveis = mensagens
          .filter((m) => Date.now() - m.createdTimestamp < MAIOR_QUE_14_DIAS && !m.pinned)
          .first(qtd);

        if (!apagaveis.length) {
          return interaction.editReply('⚠️ Nenhuma mensagem recente para apagar (as mais antigas que 14 dias não podem ser removidas em massa).');
        }

        await interaction.channel.bulkDelete(apagaveis, true);
        return interaction.editReply(`🧹 ${apagaveis.length} mensagens recentes apagadas.`);
      } catch (e2) {
        console.error('[Limpar-slash] fallback', e2);
        return interaction.editReply('❌ Não consegui apagar. Mensagens com mais de 14 dias não podem ser removidas em massa.');
      }
    }
  },
};
