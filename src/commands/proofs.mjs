/**
 * Comando /proof
 *
 * Subcomandos:
 *   /proof registrar  — abre o modal de registro de prova de venda
 *   /proof listar     — lista as provas recentes do servidor
 *
 * Permissão padrão: ManageMessages
 * (apenas membros com permissão de gerenciar mensagens podem registrar provas)
 */

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { buildProofModal, openProofsList } from '../modules/proofs/index.mjs';

export default {
  data: new SlashCommandBuilder()
    .setName('proof')
    .setDescription('Gerencie provas de venda do servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(sub =>
      sub
        .setName('registrar')
        .setDescription('Abre o formulário para registrar uma nova prova de venda.'),
    )
    .addSubcommand(sub =>
      sub
        .setName('listar')
        .setDescription('Lista as provas de venda recentes deste servidor.'),
    ),

  // ── Prefix command ───────────────────────────────────────────────────────
  name: 'proof',

  async executePrefix(message) {
    await message.reply('📋 Use `/proof` para gerenciar provas.\n💡 Comandos slash oferecem uma interface visual completa.');
  },

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'registrar') {
      // Abre o modal — sem defer (showModal não permite deferred)
      const modal = buildProofModal();
      await interaction.showModal(modal);
      return;
    }

    if (sub === 'listar') {
      await openProofsList(interaction);
      return;
    }
  },
};
