/**
 * Comando /embed
 *
 * Abre o Editor Visual de Embeds para o administrador configurar
 * e publicar uma embed personalizada no servidor.
 *
 * Comando slash-only: o editor requer uma Discord Interaction e não
 * pode ser aberto via comando de prefixo (! ).
 *
 * Uso:
 *   /embed  — abre o editor (pré-carrega configuração existente, se houver)
 */

import { SlashCommandBuilder } from 'discord.js';
import { openEditor }       from '../modules/editor/index.mjs';
import { createDefinition } from '../modules/embed/index.mjs';
import { getAllSettings }   from '../database/repositories/GuildConfig.mjs';

export default {
  // ── Slash command ──────────────────────────────────────────────────────────
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Configura e publica uma embed personalizada neste servidor.'),

  /**
   * Carrega configuração existente do servidor (se houver) e abre o editor.
   * Se nunca configurado, getAllSettings retorna {} e todos os campos
   * aparecem como "não configurado".
   *
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const definition  = createDefinition();
    const dadosAtuais = getAllSettings(interaction.guildId, 'embed');
    await openEditor(interaction, definition, dadosAtuais);
  },
};
