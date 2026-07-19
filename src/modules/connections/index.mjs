/**
 * Sistema de Conexões — Ponto de entrada público.
 *
 * Exporta:
 *   - registerAction / getRegisteredActions / getAction  (registry)
 *   - executeConnections                                  (executor)
 *   - registerConnectionsHandler                         (boot)
 *   - openConexoesPanel                                  (comando /conexoes)
 *
 * Uso básico (disparar conexões ativas para uma ação):
 *
 *   import { executeConnections } from '../modules/connections/index.mjs';
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
 * Registrar uma ação:
 *
 *   import { registerAction } from '../modules/connections/index.mjs';
 *
 *   registerAction('proof', {
 *     label:       'Prova de Venda',
 *     description: 'Disparado quando uma venda é comprovada',
 *   });
 */

import { register }                from '../../handlers/componentHandler.mjs';
import { listActiveConnections }   from '../../database/repositories/Connections.mjs';
import { getTemplate }             from '../../database/repositories/Templates.mjs';
import { applyVariablesToEmbedData } from '../variables/index.mjs';
import { buildEmbed }              from '../templates/definition.mjs';
import { logger }                  from '../../utils/logger.mjs';
import { registerAction, getRegisteredActions, getAction } from './registry.mjs';
import { handleConexoesComponent, openConexoesPanel } from './actions.mjs';

// ── Re-exporta registry ───────────────────────────────────────────────────────
export { registerAction, getRegisteredActions, getAction };
export { openConexoesPanel };

// ── Registro no componentHandler ──────────────────────────────────────────────

/**
 * Registra o namespace 'conexoes' no componentHandler.
 * Deve ser chamado uma única vez no boot do bot (src/index.mjs).
 */
export function registerConnectionsHandler() {
  register('conexoes', handleConexoesComponent);
  logger.info('[Connections] Handler registrado no namespace "conexoes".');
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

  const results   = { sent: 0, errors: [] };
  const actionDef = getAction(action);

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
      const fullContext  = { ...context, guild, channel };
      const resolvedData = applyVariablesToEmbedData(template.data, fullContext);

      // 6. Constrói a embed
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

      // 8. Callback opcional da ação
      if (actionDef?.onExecuted) {
        try {
          await actionDef.onExecuted({
            connection:   conn,
            template,
            resolvedData,
            channel,
            guild,
            context:      fullContext,
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
