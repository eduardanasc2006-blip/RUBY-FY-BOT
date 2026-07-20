/**
 * Repositório de Permissões por Módulo.
 *
 * Armazena quais cargos (roleIds) têm acesso a cada módulo do Ruby FY,
 * por servidor (guildId). Utiliza a tabela guild_settings com module='permissions'.
 *
 * Regras de acesso:
 *   1. Administradores (PermissionFlagsBits.Administrator) → acesso total.
 *   2. Se nenhum cargo for configurado para o módulo → acesso livre.
 *   3. Se houver cargos configurados → usuário deve ter ao menos um deles.
 *
 * Todas as funções recebem `guildId` para garantir isolamento entre servidores.
 */

import { getOrCreate, getAllSettings, setSetting } from './GuildConfig.mjs';

const MODULE = 'permissions';

// ── Módulos suportados ────────────────────────────────────────────────────────

/**
 * Módulos que suportam controle de permissão.
 * Usado para listagem e validação.
 */
export const SUPPORTED_MODULES = [
  'embeds',
  'modelos',
  'conexoes',
  'tickets',
  'pedidos',
  'clientes',
  'proofs',
  'painel',
  'stats',
  'variaveis',
];

// ── Leitura ───────────────────────────────────────────────────────────────────

/**
 * Retorna os roleIds configurados para um módulo nesta guild.
 * Lista vazia significa que não há restrição de cargo configurada.
 *
 * @param {string} guildId
 * @param {string} moduleName
 * @returns {string[]}
 */
export function getModuleRoles(guildId, moduleName) {
  const settings = getAllSettings(guildId, MODULE);
  const raw = settings[moduleName] ?? null;
  if (!raw) return [];
  return raw.split(',').map(r => r.trim()).filter(Boolean);
}

/**
 * Retorna todas as permissões configuradas para esta guild.
 *
 * @param {string} guildId
 * @returns {Record<string, string[]>}
 */
export function getAllPermissions(guildId) {
  const settings = getAllSettings(guildId, MODULE);
  const result = {};
  for (const mod of SUPPORTED_MODULES) {
    const raw = settings[mod] ?? null;
    result[mod] = raw ? raw.split(',').map(r => r.trim()).filter(Boolean) : [];
  }
  return result;
}

// ── Escrita ───────────────────────────────────────────────────────────────────

/**
 * Define os roleIds para um módulo nesta guild.
 * Passar lista vazia remove a restrição (acesso livre).
 *
 * @param {string} guildId
 * @param {string} moduleName
 * @param {string[]} roleIds
 */
export function setModuleRoles(guildId, moduleName, roleIds) {
  getOrCreate(guildId);
  const value = roleIds.filter(Boolean).join(',') || null;
  setSetting(guildId, MODULE, moduleName, value);
}

/**
 * Remove a restrição de cargos de um módulo (acesso livre).
 *
 * @param {string} guildId
 * @param {string} moduleName
 */
export function clearModuleRoles(guildId, moduleName) {
  setModuleRoles(guildId, moduleName, []);
}

// ── Verificação ───────────────────────────────────────────────────────────────

/**
 * Verifica se um membro tem permissão para acessar um módulo.
 *
 * Regras (em ordem de prioridade):
 *   1. Membro com Administrator → PERMITE.
 *   2. Sem roleIds configurados para o módulo → PERMITE.
 *   3. Membro tem ao menos um dos roleIds configurados → PERMITE.
 *   4. Caso contrário → NEGA.
 *
 * @param {import('discord.js').GuildMember} member
 * @param {string} guildId
 * @param {string} moduleName
 * @returns {boolean}
 */
export function hasModulePermission(member, guildId, moduleName) {
  if (!member) return false;

  // Administradores têm acesso irrestrito
  if (member.permissions?.has('Administrator')) return true;

  const allowedRoles = getModuleRoles(guildId, moduleName);

  // Sem restrição configurada → acesso livre
  if (allowedRoles.length === 0) return true;

  // Verifica se o membro tem algum dos cargos permitidos
  return allowedRoles.some(roleId => member.roles?.cache?.has(roleId));
}

/**
 * Constrói uma mensagem de negação de acesso formatada para o Discord.
 *
 * @param {string} moduleName
 * @returns {string}
 */
export function buildDeniedMessage(moduleName) {
  return `❌ Você não tem permissão para acessar o módulo **${moduleName}**. Peça a um administrador para configurar as permissões.`;
}
