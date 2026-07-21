/**
 * Comando /painel
 *
 * Abre o Painel Central do Ruby FY — hub de acesso a todos os módulos.
 * Responde com uma mensagem ephemeral contendo botões para cada módulo.
 *
 * Permissão padrão: ManageGuild (configuração de servidor)
 */

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { openPainel } from '../modules/painel/index.mjs';

export default {
  data: new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Abre o painel central do Ruby FY com acesso a todos os módulos.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  // ── Prefix command ───────────────────────────────────────────────────────
  name: 'painel',

  async executePrefix(message) {
    await message.reply('📋 Use `/painel` para abrir o painel central.\n💡 Comandos slash oferecem uma interface visual completa.');
  },

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    await openPainel(interaction);
  },
};
