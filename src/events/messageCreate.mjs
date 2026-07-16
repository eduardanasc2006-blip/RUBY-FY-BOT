import { Events } from 'discord.js';
import { config } from '../config/bot.mjs';

export default {
  name: Events.MessageCreate,
  once: false,

  async execute(message) {
    // Ignora bots e mensagens sem o prefixo
    if (message.author.bot) return;
    if (!message.content.startsWith(config.prefix)) return;

    // Extrai nome do comando e argumentos
    const args = message.content.slice(config.prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();

    const command = message.client.prefixCommands.get(commandName);

    if (!command) return; // Comando desconhecido — ignora silenciosamente

    try {
      await command.executePrefix(message, args);
    } catch (error) {
      console.error(`[MessageCreate] Erro ao executar !${commandName}:`, error);
      message.reply('Ocorreu um erro ao executar este comando.').catch(() => {});
    }
  },
};
