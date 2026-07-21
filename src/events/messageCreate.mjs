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
    const contentWithoutPrefix = message.content.slice(config.prefix.length);
    const args = contentWithoutPrefix.trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();

    // Primeiro tenta comandos nativos de prefixo
    const command = message.client.prefixCommands.get(commandName);

    if (command) {
      try {
        await command.executePrefix(message, args);
      } catch (error) {
        console.error(`[MessageCreate] Erro ao executar !${commandName}:`, error);
        message.reply('Ocorreu um erro ao executar este comando.').catch(() => {});
      }
      return;
    }

    // Se não encontrou comando nativo, tenta comandos personalizados
    if (message.guildId) {
      try {
        const { executeByPrefix } = await import('../modules/customcommands/index.mjs');
        await executeByPrefix(message, commandName);
      } catch (error) {
        console.error(`[MessageCreate] Erro ao executar comando personalizado ${commandName}:`, error);
      }
    }
  },
};
