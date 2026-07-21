/**
 * Executor de Comandos Personalizados.
 *
 * Executa comandos personalizados quando um usuário envia uma mensagem
 * com o prefixo do bot.
 */

import { logger } from '../../utils/logger.mjs';
import {
  getCommandByName,
  incrementUseCount,
  CONTENT_TYPES,
} from '../../database/repositories/CustomCommands.mjs';
import { loadServerVariablesMap } from '../../database/repositories/ServerVariables.mjs';
import { resolveVariables, applyVariablesToEmbedData } from '../variables/index.mjs';

// ── Auditoria ─────────────────────────────────────────────────────────────────

const AUDIT_MODULE = 'comandos';

async function logAudit(guildId, actorId, commandName, result = 'success', detail = null) {
  try {
    const { logAction } = await import('../../database/repositories/AuditLog.mjs');
    await logAction({
      guildId,
      actorId,
      module: AUDIT_MODULE,
      action: 'command_executed',
      entity: 'command',
      entityId: commandName,
      details: detail || `Comando "${commandName}" executado`,
      result,
    });
  } catch (err) {
    logger.warn('[CustomCommands] Falha ao registrar auditoria:', err?.message);
  }
}

// ── Contexto ──────────────────────────────────────────────────────────────────

/**
 * Constrói o contexto de variáveis para um comando.
 *
 * @param {import('discord.js').Message} message
 * @param {string} guildId
 * @returns {object}
 */
function buildContext(message, guildId) {
  const context = {
    guildId,
    guild: message.guild,
    channel: message.channel,
    member: message.member,
    user: message.author,
  };

  return context;
}

// ── Execução principal ────────────────────────────────────────────────────────

/**
 * Executa um comando personalizado.
 *
 * Fluxo:
 * 1. Busca o comando pelo nome
 * 2. Verifica se está habilitado
 * 3. Resolva as variáveis do servidor
 * 4. Resolve as variáveis padrão
 * 5. Envia a resposta
 * 6. Incrementa o contador de uso
 * 7. Registra auditoria
 *
 * @param {import('discord.js').Message} message - Mensagem do usuário
 * @param {string} commandName - Nome do comando
 * @returns {Promise<boolean>} true se o comando foi executado, false caso contrário
 */
export async function executeCustomCommand(message, commandName) {
  const guildId = message.guildId;
  const userId  = message.author.id;

  // Busca o comando
  const command = getCommandByName(guildId, commandName);

  // Comando não encontrado
  if (!command) {
    return false;
  }

  // Verifica se está habilitado
  if (!command.enabled) {
    await message.reply({
      content: `❌ O comando **${command.name}** está desativado.`,
      failIfNotExists: false,
    }).catch(() => {});
    await logAudit(guildId, userId, command.name, 'skipped', 'Comando desativado');
    return true; // Comando existe, mas está desativado
  }

  try {
    // Carrega variáveis do servidor
    const serverVars = loadServerVariablesMap(guildId);

    // Constrói o contexto
    const context = {
      ...buildContext(message, guildId),
      serverVariables: serverVars,
    };

    // Resolve as variáveis e envia o conteúdo
    if (command.contentType === CONTENT_TYPES.TEXT) {
      const text = command.contentData.text || '';
      const resolved = resolveVariables(text, context);

      await message.reply({
        content: resolved,
        failIfNotExists: false,
      });
    } else if (command.contentType === CONTENT_TYPES.EMBED) {
      const embedData = applyVariablesToEmbedData(command.contentData, context);

      await message.reply({
        embeds: [embedData],
        failIfNotExists: false,
      });
    } else {
      // Tipo desconhecido, tenta como texto
      const text = command.contentData.text || command.contentData || '';
      const resolved = typeof text === 'string' ? resolveVariables(text, context) : String(text);

      await message.reply({
        content: resolved,
        failIfNotExists: false,
      });
    }

    // Incrementa contador de uso
    incrementUseCount(guildId, command.id);

    // Registra auditoria
    await logAudit(guildId, userId, command.name, 'success');

    return true;
  } catch (err) {
    logger.error(`[CustomCommands] Erro ao executar comando "${command.name}":`, err);

    await message.reply({
      content: '❌ Ocorreu um erro ao executar este comando.',
      failIfNotExists: false,
    }).catch(() => {});

    await logAudit(guildId, userId, command.name, 'error', err?.message);

    return true; // Comando existe, mas houve erro
  }
}

/**
 * Lista os nomes de todos os comandos ativos de um servidor.
 * Usado para verificar se um comando existe antes de executar.
 *
 * @param {string} guildId
 * @returns {string[]}
 */
export async function listActiveCommandNames(guildId) {
  const { listCommands } = await import('../../database/repositories/CustomCommands.mjs');
  const commands = listCommands(guildId, { enabledOnly: true });
  return commands.map(cmd => cmd.name.toLowerCase());
}
