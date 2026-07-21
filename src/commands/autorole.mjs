/**
 * Comando /autorole
 *
 * Abre o gerenciador de cargos automáticos do servidor.
 *
 * Cargos automáticos são atribuídos a novos membros quando eles entram no servidor.
 *
 * Permissão: 'autorole' (módulo) ou Administrator.
 */

import {
  SlashCommandBuilder,
  MessageFlags,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalBuilder,
} from 'discord.js';
import { hasModulePermission, buildDeniedMessage } from '../modules/permissions/index.mjs';
import { openAutoRoleManager, handleAutoRoleComponent } from '../modules/autorole/index.mjs';
import { addAutoRole, getAutoRole, hasAutoRole } from '../database/repositories/AutoRoles.mjs';
import { logAudit } from '../database/repositories/AuditLog.mjs';
import { build } from '../utils/customId.mjs';

export default {
  data: new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('Gerencie cargos automáticos para novos membros.'),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    if (!interaction.guildId) {
      return interaction.reply({
        content: '❌ Este comando só pode ser usado em servidores.',
        flags:   MessageFlags.Ephemeral,
      });
    }

    if (!hasModulePermission(interaction.member, interaction.guildId, 'autorole')) {
      return interaction.reply({
        content: buildDeniedMessage('autorole'),
        flags:   MessageFlags.Ephemeral,
      });
    }

    return openAutoRoleManager(interaction);
  },
};

/**
 * Handler para o modal de adicionar cargo.
 *
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 * @param {string[]} partes
 */
export async function handleAutoRoleModal(interaction, partes) {
  if (!interaction.guildId) {
    return interaction.reply({
      content: '❌ Este comando só pode ser usado em servidores.',
      flags:   MessageFlags.Ephemeral,
    });
  }

  const roleId    = interaction.fields.getTextInputValue('role_id').trim();
  const priorityStr = interaction.fields.getTextInputValue('priority').trim();
  const priority  = priorityStr ? parseInt(priorityStr, 10) : 100;

  // Validar que é um ID numérico
  if (!/^\d{17,19}$/.test(roleId)) {
    return interaction.reply({
      content: '⚠️ ID do cargo inválido. Por favor, cole um ID numérico de 17-19 dígitos.\n\nComo obter o ID: Ative o Modo Desenvolvedor no Discord, clique com o botão direito no cargo e escolha "Copiar ID".',
      flags:   MessageFlags.Ephemeral,
    });
  }

  // Verificar se o cargo existe no servidor
  const role = interaction.guild?.roles?.cache?.get(roleId);
  if (!role) {
    return interaction.reply({
      content: '⚠️ Cargo não encontrado neste servidor. Verifique se o ID está correto e se o cargo ainda existe.',
      flags:   MessageFlags.Ephemeral,
    });
  }

  // Verificar se o cargo já está configurado
  if (hasAutoRole(interaction.guildId, roleId)) {
    return interaction.reply({
      content: `⚠️ O cargo **${role.name}** já está configurado como automático.`,
      flags:   MessageFlags.Ephemeral,
    });
  }

  // Adicionar cargo automático
  const autoRole = addAutoRole(interaction.guildId, roleId, { priority });

  if (!autoRole) {
    return interaction.reply({
      content: '❌ Erro ao adicionar o cargo automático. Tente novamente.',
      flags:   MessageFlags.Ephemeral,
    });
  }

  // Registrar auditoria
  logAudit({
    guildId: interaction.guildId,
    actorId: interaction.user.id,
    module: 'autorole',
    action: 'auto_role_configured',
    entity: 'auto_role',
    entityId: autoRole.id,
    result: 'success',
    details: {
      roleId,
      roleName: role.name,
      priority,
    },
    source: 'admin',
  });

  return interaction.reply({
    content: `✅ Cargo **${role.name}** adicionado como automático!\n📊 Prioridade: ${priority}\n\nEle será atribuído a todos os novos membros.`,
    flags:   MessageFlags.Ephemeral,
  });
}
