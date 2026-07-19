/**
 * Comando /conexoes
 *
 * Abre o painel visual de gerenciamento de conexões do servidor.
 * Uma conexão liga uma AÇÃO a um MODELO e a um CANAL DE DESTINO,
 * permitindo que eventos automatizados publiquem mensagens configuráveis.
 *
 * Requer permissão ManageGuild — apenas administradores podem configurar conexões.
 */

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { openConexoesPanel } from '../modules/connections/index.mjs';

export default {
  data: new SlashCommandBuilder()
    .setName('conexoes')
    .setDescription('Gerencie as conexões de ações automáticas do servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    await openConexoesPanel(interaction);
  },
};
