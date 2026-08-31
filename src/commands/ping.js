const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Testa a latência do bot.'),
  async execute(interaction) {
    const api = Math.round(interaction.client.ws.ping);
    const bot = Date.now() - interaction.createdTimestamp;
    return interaction.reply({
      content: `🏓 Pong!\n➜ Latência do bot: **${bot}ms**\n➜ API: **${api}ms**`,
    });
  },
};