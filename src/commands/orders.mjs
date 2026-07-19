/**
 * Comando /pedido
 *
 * Subcomandos:
 *   /pedido criar   — abre o modal de criação de pedido
 *   /pedido listar  — lista os pedidos recentes com select de gerenciamento
 *
 * Permissão padrão: ManageMessages
 */

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { buildOrderModal, openOrdersList } from '../modules/orders/index.mjs';

export default {
  data: new SlashCommandBuilder()
    .setName('pedido')
    .setDescription('Gerencie pedidos de venda do servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(sub =>
      sub
        .setName('criar')
        .setDescription('Abre o formulário para criar um novo pedido.'),
    )
    .addSubcommand(sub =>
      sub
        .setName('listar')
        .setDescription('Lista os pedidos recentes com opções de gerenciamento.'),
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'criar') {
      const modal = buildOrderModal();
      await interaction.showModal(modal);
      return;
    }

    if (sub === 'listar') {
      await openOrdersList(interaction);
      return;
    }
  },
};
