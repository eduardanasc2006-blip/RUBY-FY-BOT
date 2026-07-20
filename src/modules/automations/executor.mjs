/**
 * Automações Visuais — Executor de gatilhos (Etapa 16).
 *
 * Responsabilidades:
 *   - Buscar automações ativas para um gatilho
 *   - Avaliar condições (sem eval/Function)
 *   - Executar ações em sequência
 *   - Rate limiting (máx 10 execuções/min por automação)
 *   - Registrar resultado nos logs
 *   - Isolar falhas: uma automação com erro não interrompe as demais
 */

import { logger }                   from '../../utils/logger.mjs';
import { logEvent }                 from '../../utils/eventLog.mjs';
import { getTemplate }              from '../../database/repositories/Templates.mjs';
import { executeConnections }       from '../connections/index.mjs';
import { buildEmbed }               from '../templates/definition.mjs';
import {
  listEnabledAutomations,
  logAutomationExecution,
} from '../../database/repositories/Automations.mjs';
import { evaluateConditions }       from './flow.mjs';

// ── Rate limiting ─────────────────────────────────────────────────────────────

/** Map<`${guildId}:${automationId}`, number[]> — timestamps de execuções recentes */
const _rateLimit = new Map();
const RATE_WINDOW_MS = 60_000; // 1 minuto
const RATE_MAX       = 10;     // máx execuções por janela

function checkRateLimit(guildId, automationId) {
  const key  = `${guildId}:${automationId}`;
  const now  = Date.now();
  const prev = (_rateLimit.get(key) ?? []).filter(t => now - t < RATE_WINDOW_MS);

  if (prev.length >= RATE_MAX) return false;

  prev.push(now);
  _rateLimit.set(key, prev);
  return true;
}

/** Limpa o estado de rate limit (usado em testes). */
export function _clearRateLimit() {
  _rateLimit.clear();
}

// ── Executor principal ────────────────────────────────────────────────────────

/**
 * Dispara automações ativas para um gatilho em um servidor.
 *
 * Fluxo por automação:
 *  1. Rate limit — impede spam
 *  2. Condições — AND lógico; falha → skipped
 *  3. Ações — executadas em sequência; falha → logged, não bloqueia as demais automações
 *  4. Log — registra resultado
 *
 * @param {string} trigger           — nome do gatilho (ex: 'ticket_opened')
 * @param {object} context           — contexto de execução (deve conter guildId)
 * @param {import('discord.js').Client} discordClient
 * @returns {Promise<{ executed: number, skipped: number, errors: number }>}
 */
export async function fireAutomationTrigger(trigger, context, discordClient) {
  const guildId = context?.guildId;

  if (!guildId || !trigger || !discordClient) {
    logger.warn(`[Automations] fireAutomationTrigger: parâmetros inválidos — trigger=${trigger}, guildId=${guildId}`);
    return { executed: 0, skipped: 0, errors: 0 };
  }

  let automations;
  try {
    automations = listEnabledAutomations(guildId, trigger);
  } catch (err) {
    logger.error('[Automations] Erro ao listar automações:', err?.message);
    return { executed: 0, skipped: 0, errors: 1 };
  }

  if (automations.length === 0) return { executed: 0, skipped: 0, errors: 0 };

  const guild = discordClient.guilds.cache.get(guildId);
  if (!guild) {
    logger.warn(`[Automations] Guild ${guildId} não encontrada no cache.`);
    return { executed: 0, skipped: 0, errors: 0 };
  }

  const results = { executed: 0, skipped: 0, errors: 0 };

  for (const automation of automations) {
    // 1. Rate limit
    if (!checkRateLimit(guildId, automation.id)) {
      logger.warn(`[Automations] Rate limit atingido: ${automation.id} | guild: ${guildId}`);
      results.skipped++;
      try { logAutomationExecution(guildId, automation.id, trigger, 'skipped', 'rate_limit'); } catch { /* não bloqueia */ }
      continue;
    }

    // 2. Condições
    const pass = evaluateConditions(automation.conditions, context, guild);
    if (!pass) {
      results.skipped++;
      try { logAutomationExecution(guildId, automation.id, trigger, 'skipped', 'condition_failed'); } catch { /* não bloqueia */ }
      continue;
    }

    // 3. Ações
    try {
      for (const action of automation.actions) {
        await executeAction(action, context, guild, discordClient);
      }
      results.executed++;
      try { logAutomationExecution(guildId, automation.id, trigger, 'success', null); } catch { /* não bloqueia */ }
      logger.info(`[Automations] Executada: ${automation.name} | trigger: ${trigger} | guild: ${guildId}`);
    } catch (err) {
      const detail = (err?.message ?? 'unknown_error').slice(0, 255);
      logger.error(`[Automations] Erro na automação '${automation.name}': ${detail}`);
      results.errors++;
      try { logAutomationExecution(guildId, automation.id, trigger, 'error', detail); } catch { /* não bloqueia */ }
      // Uma falha NÃO interrompe as demais automações
    }
  }

  logger.info(
    `[Automations] trigger='${trigger}' guild=${guildId} | executadas=${results.executed} skipped=${results.skipped} erros=${results.errors}`
  );
  return results;
}

// ── Executor de ações individuais ─────────────────────────────────────────────

/**
 * Executa uma única ação de automação.
 * Lança erro em caso de falha (capturado pelo caller).
 *
 * @param {{ type: string, [key: string]: any }} action
 * @param {object} context
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').Client} discordClient
 */
async function executeAction(action, context, guild, discordClient) {
  switch (action.type) {
    case 'send_embed': {
      const channel = guild.channels.cache.get(action.channelId);
      if (!channel) throw new Error('channel_not_found');

      const template = getTemplate(guild.id, action.templateId);
      if (!template) throw new Error('template_not_found');

      const embed = buildEmbed(template.data);
      if (Array.isArray(template.data.fields) && template.data.fields.length > 0) {
        for (const f of template.data.fields) {
          embed.addFields({ name: f.name || '\u200b', value: f.value || '\u200b', inline: f.inline ?? false });
        }
      }
      await channel.send({ embeds: [embed] });
      break;
    }

    case 'execute_connection': {
      const connAction = action.connectionAction ?? 'automation';
      await executeConnections(connAction, { ...context, guildId: guild.id }, discordClient);
      break;
    }

    case 'add_role': {
      if (!action.roleId) throw new Error('roleId_missing');
      const role = guild.roles.cache.get(action.roleId);
      if (!role) throw new Error('role_not_found');

      const member = context.member
        ?? await guild.members.fetch(context.userId).catch(() => null);
      if (!member) throw new Error('member_not_found');

      await member.roles.add(action.roleId);
      break;
    }

    case 'remove_role': {
      if (!action.roleId) throw new Error('roleId_missing');
      const role = guild.roles.cache.get(action.roleId);
      if (!role) throw new Error('role_not_found');

      const member = context.member
        ?? await guild.members.fetch(context.userId).catch(() => null);
      if (!member) throw new Error('member_not_found');

      await member.roles.remove(action.roleId);
      break;
    }

    case 'log': {
      try {
        logEvent(guild.id, 'automation', {
          message: action.message ?? 'Automação executada.',
          trigger: context.trigger ?? 'unknown',
          userId:  context.userId  ?? null,
        });
      } catch { /* log não pode bloquear a automação */ }
      break;
    }

    default:
      logger.warn(`[Automations] Tipo de ação desconhecido: '${action.type}'`);
  }
}
