/**
 * Módulo de Comandos Personalizados.
 *
 * Permite que cada servidor crie seus próprios comandos personalizados
 * que são executados quando um usuário envia uma mensagem com o prefixo do bot.
 *
 * Uso:
 *   import { executeCustomCommand } from './modules/customcommands/executor.mjs';
 *   import { openCommandsPanel } from './modules/customcommands/index.mjs';
 *
 * Comandos personalizados suportam:
 *   - Texto simples com variáveis {variavel}
 *   - Embeds do Discord
 *   - Resolução de variáveis do servidor
 *   - Contador de uso
 *   - Ativação/desativação
 */

import { register } from '../../handlers/componentHandler.mjs';
import { logger } from '../../utils/logger.mjs';

// Re-exporta componentes para uso em outros módulos
export { executeCustomCommand } from './executor.mjs';
export { listActiveCommandNames } from './executor.mjs';
export { handleCustomCommandsComponent } from './actions.mjs';
export { handleDeleteConfirm } from './actions.mjs';
export {
  buildCommandsListEmbed,
  buildCommandDetailEmbed,
  buildCreateModal,
  buildEditModal,
  buildListButtons,
  buildDetailButtons,
  buildCommandSelectMenu,
  validateName,
  validateDescription,
  validateTextContent,
  validateEmbedContent,
} from './flow.mjs';

// ── Registro do handler ────────────────────────────────────────────────────────

/**
 * Registra os handlers de componentes de comandos personalizados.
 * Deve ser chamado UMA ÚNICA VEZ em src/index.mjs.
 */
export function registerCustomCommandsHandler() {
  // Import dinâmico para evitar dependência circular no boot
  import('./actions.mjs').then(({ handleCustomCommandsComponent, handleDeleteConfirm }) => {
    register('comandos', handleCustomCommandsComponent);
    register('comandos', (interaction) => {
      // Handler especial para confirmação de exclusão
      if (interaction.customId.startsWith('comandos:confirm_delete:')) {
        return handleDeleteConfirm(interaction);
      }
      return handleCustomCommandsComponent(interaction);
    });
    logger.info('[CustomCommands] Handler registrado no namespace "comandos".');
  }).catch(err => {
    logger.error('[CustomCommands] Falha ao registrar handler:', err);
  });
}

// ── Painel de gerenciamento ────────────────────────────────────────────────────

/**
 * Abre o painel de gerenciamento de comandos.
 * Chamado pelo comando /comandos.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
export async function openCommandsPanel(interaction) {
  const { MessageFlags } = await import('discord.js');
  const { listCommands } = await import('../../database/repositories/CustomCommands.mjs');
  const { buildCommandsListEmbed } = await import('./flow.mjs');

  const commands = listCommands(interaction.guildId);
  const payload  = buildCommandsListEmbed(commands, interaction.guild?.name);

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({ ...payload, flags: MessageFlags.Ephemeral });
  } else {
    await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
  }
}

// ── Comandos de prefixo ────────────────────────────────────────────────────────

/**
 * Executa um comando personalizado por nome.
 * Usado pelo messageCreate para executar comandos de prefixo.
 *
 * @param {import('discord.js').Message} message
 * @param {string} commandName
 * @returns {Promise<boolean>}
 */
export async function executeByPrefix(message, commandName) {
  const { executeCustomCommand } = await import('./executor.mjs');
  return executeCustomCommand(message, commandName);
}
