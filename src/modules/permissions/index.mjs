/**
 * Módulo de Permissões — Ponto de entrada público.
 *
 * Re-exporta as funções do repositório de permissões para uso nos módulos.
 *
 * Uso:
 *   import { hasModulePermission, buildDeniedMessage } from '../modules/permissions/index.mjs';
 *
 *   if (!hasModulePermission(interaction.member, interaction.guildId, 'pedidos')) {
 *     return interaction.reply({ content: buildDeniedMessage('pedidos'), flags: MessageFlags.Ephemeral });
 *   }
 */

export {
  SUPPORTED_MODULES,
  getModuleRoles,
  getAllPermissions,
  setModuleRoles,
  clearModuleRoles,
  hasModulePermission,
  buildDeniedMessage,
} from '../../database/repositories/Permissions.mjs';
