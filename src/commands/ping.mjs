import { SlashCommandBuilder } from 'discord.js';

export default {
  // ── Slash command ────────────────────────────────────────────────────────
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Verifica se o bot está online e mostra a latência.'),

  async execute(interaction) {
    const latencia = interaction.client.ws.ping;
    await interaction.reply(`🏓 Pong! Latência: **${latencia}ms**`);
  },

  // ── Prefix command ───────────────────────────────────────────────────────
  name: 'ping',
  aliases: ['p'],

  async executePrefix(message) {
    const latencia = message.client.ws.ping;
    await message.reply(`🏓 Pong! Latência: **${latencia}ms**`);
  },
};
