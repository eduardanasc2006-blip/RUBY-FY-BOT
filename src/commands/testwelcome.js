const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const welcomeStore = require('../utils/welcomeStore');
const { buildEmbed } = require('../utils/embedPainel');
const { interpolar, interpolarEmbed } = require('../utils/interpolar');
const { comandoPode } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('testwelcome')
    .setDescription('Envia a mensagem de boas-vindas neste canal para testar (admin)'),
  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'embed')) {
      return interaction.reply({ content: '🔒 Somente administradores podem usar este comando.', flags: MessageFlags.Ephemeral });
    }

    const conf = welcomeStore.obter(interaction.guild.id);
    const canal = interaction.channel;
    const vars = { user: '<@' + interaction.user.id + '>', server: interaction.guild.name };

    if (!conf || !conf.embed) {
      const content = conf ? interpolar(conf.content || null, vars) : null;
      if (!content) {
        return interaction.reply({ content: '💤 Nenhuma mensagem de boas-vindas configurada ainda. Use **/setwelcome** para criar uma.', flags: MessageFlags.Ephemeral });
      }
      await interaction.reply({ content: '✅ Teste enviado abaixo↑' , flags: MessageFlags.Ephemeral });
      return canal.send({ content });
    }

    const embed = buildEmbed(conf.embed);
    if (embed) interpolarEmbed(embed, vars);
    const content = interpolar(conf.content || null, vars);
    await interaction.reply({ content: '✅ Teste enviado abaixo↑' , flags: MessageFlags.Ephemeral });
    return canal.send({ embeds: embed ? [embed] : [], content });
  },
};