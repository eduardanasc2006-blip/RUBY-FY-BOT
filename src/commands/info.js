const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

function formatoUptime(segundos) {
  const d = Math.floor(segundos / 86400);
  const h = Math.floor((segundos % 86400) / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = Math.floor(segundos % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Mostra informações básicas do bot.'),
  async execute(interaction) {
    const totalUsuarios = interaction.client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);
    const embed = new EmbedBuilder()
      .setColor(0xbeb6ff)
      .setTitle('🤖 RUBY FY BOT')
      .addFields(
        { name: '➜ Versão', value: '2.0.0', inline: true },
        { name: '➜ Servidores', value: String(interaction.client.guilds.cache.size), inline: true },
        { name: '➜ Usuários', value: String(totalUsuarios), inline: true },
        { name: '➜ Latência', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true },
        { name: '➜ Uptime', value: formatoUptime(process.uptime()), inline: true },
      );
    return interaction.reply({ embeds: [embed] });
  },
};