/**
 * Comando /paineis
 *
 * Abre o gerenciador de Painéis Personalizados.
 * Permite criar, editar e publicar painéis com botões configuráveis.
 *
 * Permissão padrão: ManageGuild
 *
 * Os painéis criados aqui são publicados em canais via botão "Publicar"
 * no editor visual. Cada botão pode executar ações como:
 *   - Exibir mensagem ephemeral
 *   - Conceder/remover/alternar cargo
 *   - Abrir ticket
 *   - Disparar uma conexão
 */

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { openCustomPanelsManager } from '../modules/custompanels/index.mjs';

export default {
  data: new SlashCommandBuilder()
    .setName('paineis')
    .setDescription('Gerencia os painéis personalizados do servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  // ── Prefix command ───────────────────────────────────────────────────────
  name: 'paineis',

  async executePrefix(message) {
    await message.reply('📋 Use `/paineis` para gerenciar painéis.\n💡 Comandos slash oferecem uma interface visual completa.');
  },

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    await openCustomPanelsManager(interaction);
  },
};
