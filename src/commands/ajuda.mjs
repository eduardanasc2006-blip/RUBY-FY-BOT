import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { config } from '../config/bot.mjs';

function buildEmbed(client) {
  return new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle(`${config.botName} — Central de Ajuda`)
    .setDescription('> Bot em desenvolvimento. Novos comandos serão adicionados em breve.')
    .addFields(
      {
        name: '🏓 Ping',
        value: '`!ping` `p` · `/ping`\nVerifica se o bot está online e mostra a latência.',
      },
      {
        name: '❓ Ajuda',
        value: '`!ajuda` `!help` · `/ajuda` `/help`\nExibe esta mensagem com todos os comandos disponíveis.',
      },
    )
    .setFooter({ text: `${config.botName} • Use ${config.prefix}ajuda para ver os comandos`, iconURL: client.user.displayAvatarURL() })
    .setTimestamp();
}

export default {
  // ── Slash command ────────────────────────────────────────────────────────
  data: new SlashCommandBuilder()
    .setName('ajuda')
    .setDescription('Exibe todos os comandos disponíveis do bot.'),

  async execute(interaction) {
    const embed = buildEmbed(interaction.client);
    await interaction.reply({ embeds: [embed] });
  },

  // ── Prefix command ───────────────────────────────────────────────────────
  name: 'ajuda',
  aliases: ['help'],

  async executePrefix(message) {
    const embed = buildEmbed(message.client);
    await message.reply({ embeds: [embed] });
  },
};
