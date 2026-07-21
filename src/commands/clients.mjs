/**
 * Comando /cliente
 *
 * Subcomandos:
 *   /cliente registrar  — abre o modal de registro de cliente
 *   /cliente listar     — lista clientes com select de gerenciamento
 *
 * Permissão padrão: ManageMessages
 */

import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { buildClientModal, openClientsList } from '../modules/clients/index.mjs';

export default {
  data: new SlashCommandBuilder()
    .setName('cliente')
    .setDescription('Gerencie clientes cadastrados no servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(sub =>
      sub
        .setName('registrar')
        .setDescription('Abre o formulário para cadastrar um novo cliente.'),
    )
    .addSubcommand(sub =>
      sub
        .setName('listar')
        .setDescription('Lista os clientes cadastrados com opções de gerenciamento.'),
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    if (!interaction.guildId) {
      return interaction.reply({
        content: '⚠️ Este comando só pode ser usado em servidores.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'registrar') {
      const modal = buildClientModal();
      await interaction.showModal(modal);
      return;
    }

    if (sub === 'listar') {
      await openClientsList(interaction);
      return;
    }
  },
};
