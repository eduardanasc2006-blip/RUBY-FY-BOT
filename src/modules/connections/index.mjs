/**
 * Sistema de Conexões — executor central e registry de ações.
 *
 * Uma Conexão liga:
 *   AÇÃO → MODELO → CONTEXTO → VARIÁVEIS → CANAL DE DESTINO
 *
 * Uso básico (disparar conexões ativas para uma ação):
 *
 *   import { executeConnections } from '../../modules/connections/index.mjs';
 *
 *   const result = await executeConnections('proof', {
 *     guildId:  '123456',
 *     cliente:  member,
 *     produto:  'Chroma Fang',
 *     valor:    '25',
 *   }, discordClient);
 *
 *   // result = { sent: 2, errors: [] }
 *
 * Registrar uma ação (para extensibilidade futura):
 *
 *   import { registerAction } from '../../modules/connections/index.mjs';
 *
 *   registerAction('proof', {
 *     description: 'Prova de venda realizada',
 *     onExecuted: async ({ connection, template, guild, context }) => { ... },
 *   });
 */

import { listActiveConnections } from '../../database/repositories/Connections.mjs';
import { getTemplate }           from '../../database/repositories/Templates.mjs';
import { applyVariablesToEmbedData } from '../variables/index.mjs';
import { buildEmbed }            from '../templates/definition.mjs';
import { logger }                from '../../utils/logger.mjs';

// ── Registry de ações ─────────────────────────────────────────────────────────

/**
 * @type {Map<string, { name: string, description: string, onExecuted: Function|null }>}
 */
const actionRegistry = new Map();

/**
 * Registra uma ação disponível no sistema de conexões.
 *
 * Isso não é obrigatório para que o executor funcione — qualquer string de ação
 * pode ter conexões. O registry serve para rastrear ações disponíveis
 * e permitir callbacks opcionais por ação.
 *
 * @param {string} name - Identificador único (ex: 'proof', 'ticket_closed')
 * @param {{
 *   description?: string,
 *   onExecuted?:  (payload: object) => Promise<void>,
 * }} opts
 */
export function registerAction(name, opts = {}) {
  if (!name || typeof name !== 'string') throw new Error('[Connections] Nome de ação inválido.');
  actionRegistry.set(name, {
    name,
    description: opts.description ?? '',
    onExecuted:  typeof opts.onExecuted === 'function' ? opts.onExecuted : null,
  });
  logger.info(`[Connections] Ação registrada: '${name}'`);
}

/**
 * Retorna todas as ações registradas.
 * @returns {Array<{ name: string, description: string }>}
 */
export function getRegisteredActions() {
  return [...actionRegistry.values()].map(({ name, description }) => ({ name, description }));
}

// ── Executor ──────────────────────────────────────────────────────────────────

/**
 * Executa todas as conexões ativas para uma ação em um servidor.
 *
 * Fluxo por conexão:
 *  1. Verifica isolamento (template pertence ao guildId)
 *  2. Verifica guild no cache do Discord
 *  3. Verifica canal (pertence à guild)
 *  4. Verifica permissão de envio
 *  5. Aplica variáveis numa cópia dos dados (original intacto)
 *  6. Constrói a embed
 *  7. Envia no canal
 *  8. Chama onExecuted (se registrado para a ação)
 *
 * Erros de uma conexão individual não afetam as demais.
 *
 * @param {string} action        - Nome da ação (ex: 'proof')
 * @param {object} context       - Contexto de execução (deve conter guildId)
 * @param {import('discord.js').Client} discordClient - Client Discord.js logado
 * @returns {Promise<{ sent: number, errors: Array<{ connectionId: string, reason: string }> }>}
 */
export async function executeConnections(action, context, discordClient) {
  const guildId = context?.guildId;

  // ── Proteções básicas ──────────────────────────────────────────────────────
  if (!guildId) {
    logger.warn('[Connections] executeConnections chamado sem guildId no contexto.');
    return { sent: 0, errors: [{ connectionId: null, reason: 'missing_guild_id' }] };
  }
  if (!action) {
    logger.warn('[Connections] executeConnections chamado sem action.');
    return { sent: 0, errors: [{ connectionId: null, reason: 'missing_action' }] };
  }
  if (!discordClient) {
    logger.warn('[Connections] executeConnections chamado sem discordClient.');
    return { sent: 0, errors: [{ connectionId: null, reason: 'missing_client' }] };
  }

  const connections = listActiveConnections(guildId, action);
  if (connections.length === 0) {
    return { sent: 0, errors: [] };
  }

  const results  = { sent: 0, errors: [] };
  const actionDef = actionRegistry.get(action) ?? null;

  for (const conn of connections) {
    try {
      // 1. Template: deve pertencer ao mesmo guildId (isolamento)
      const template = getTemplate(guildId, conn.templateId);
      if (!template) {
        logger.warn(`[Connections] Template não encontrado: ${conn.templateId} | guild: ${guildId} | conexão: ${conn.id}`);
        results.errors.push({ connectionId: conn.id, reason: 'template_not_found' });
        continue;
      }

      // 2. Guild no cache
      const guild = discordClient.guilds.cache.get(guildId);
      if (!guild) {
        results.errors.push({ connectionId: conn.id, reason: 'guild_not_in_cache' });
        continue;
      }

      // 3. Canal deve pertencer à guild (isolamento)
      const channel = guild.channels.cache.get(conn.targetChannelId);
      if (!channel) {
        logger.warn(`[Connections] Canal não encontrado: ${conn.targetChannelId} | guild: ${guildId} | conexão: ${conn.id}`);
        results.errors.push({ connectionId: conn.id, reason: 'channel_not_found' });
        continue;
      }

      // 4. Permissão de envio
      const me = guild.members.me;
      if (me && !channel.permissionsFor(me)?.has('SendMessages')) {
        results.errors.push({ connectionId: conn.id, reason: 'missing_send_permission' });
        continue;
      }

      // 5. Aplica variáveis numa cópia profunda (original do template intacto)
      const fullContext   = { ...context, guild, channel };
      const resolvedData  = applyVariablesToEmbedData(template.data, fullContext);

      // 6. Constrói a embed a partir dos dados resolvidos
      const embed = buildEmbed(resolvedData);
      if (Array.isArray(resolvedData.fields) && resolvedData.fields.length > 0) {
        for (const f of resolvedData.fields) {
          embed.addFields({
            name:   f.name  || '\u200b',
            value:  f.value || '\u200b',
            inline: f.inline ?? false,
          });
        }
      }

      // 7. Envia
      await channel.send({ embeds: [embed] });
      results.sent++;

      logger.info(`[Connections] Mensagem enviada | ação: ${action} | conexão: ${conn.id} | canal: ${conn.targetChannelId}`);

      // 8. Callback opcional da ação (erros não afetam o contador de sent)
      if (actionDef?.onExecuted) {
        try {
          await actionDef.onExecuted({
            connection: conn,
            template,
            resolvedData,
            channel,
            guild,
            context: fullContext,
          });
        } catch (cbErr) {
          logger.warn(`[Connections] onExecuted '${action}' falhou na conexão ${conn.id}:`, cbErr?.message);
        }
      }

    } catch (err) {
      logger.error(`[Connections] Erro na conexão ${conn.id} (${action}):`, err);
      results.errors.push({ connectionId: conn.id, reason: err?.message ?? 'unknown_error' });
    }
  }

  logger.info(`[Connections] Execução '${action}' concluída | guild: ${guildId} | enviados: ${results.sent} | erros: ${results.errors.length}`);
  return results;
}
