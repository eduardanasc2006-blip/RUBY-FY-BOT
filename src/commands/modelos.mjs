/**
 * Comando /modelos
 *
 * Abre o painel de gerenciamento de modelos reutilizáveis do servidor.
 * Os modelos são isolados por guildId — um servidor nunca vê os modelos
 * de outro servidor.
 *
 * Uso:
 *   /modelos  — abre o painel principal (criar / listar / editar / duplicar / excluir)
 */

import { SlashCommandBuilder } from 'discord.js';
import { openTemplatesPanel } from '../modules/templates/index.mjs';

export default {
  data: new SlashCommandBuilder()
    .setName('modelos')
    .setDescription('Gerencie os modelos de mensagens reutilizáveis do servidor.'),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    await openTemplatesPanel(interaction);
  },
};
