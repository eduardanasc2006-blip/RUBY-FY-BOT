import { Events } from 'discord.js';

export default {
  name: Events.InteractionCreate,
  once: false,

  async execute(interaction) {
    // Slash commands
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.warn(`[InteractionCreate] Comando não encontrado: ${interaction.commandName}`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`[InteractionCreate] Erro ao executar /${interaction.commandName}:`, error);

        const mensagem = { content: 'Ocorreu um erro ao executar este comando.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(mensagem);
        } else {
          await interaction.reply(mensagem);
        }
      }
      return;
    }

    // Autocomplete
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command?.autocomplete) return;

      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error(`[InteractionCreate] Erro no autocomplete de /${interaction.commandName}:`, error);
      }
    }
  },
};
