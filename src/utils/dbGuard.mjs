import { isDBConnected } from '../db/connection.mjs';
import { EmbedBuilder } from 'discord.js';

export function semBanco(msg) {
  if (isDBConnected()) return false;
  msg.reply({
    embeds: [new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('⚠️ Banco de dados offline')
      .setDescription('O banco de dados não está disponível no momento.\nEste comando requer banco de dados para funcionar.')
      .setFooter({ text: 'Tente novamente em instantes.' })],
  }).catch(() => {});
  return true;
}

export { isDBConnected };
