/**
 * Automações Visuais — Funções puras e definições (Etapa 16).
 *
 * Este módulo NÃO importa discord.js em nível superior.
 * Os builders de embed são criados internamente para manter testabilidade.
 *
 * Exporta:
 *   TRIGGERS_MAP        — gatilhos suportados
 *   ACTION_TYPES        — tipos de ação suportados
 *   CONDITION_TYPES     — tipos de condição suportados
 *   getTrigger / getTriggers
 *   getActionType / getConditionType
 *   evaluateCondition   — avalia UMA condição (sem eval/Function)
 *   evaluateConditions  — avalia lista em AND lógico
 *   buildAutomationEmbed
 *   buildAutomationListEmbed
 *   buildSuccessPayload / buildErrorPayload
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  MessageFlags,
} from 'discord.js';
import { build } from '../../utils/customId.mjs';

// ── Definições ────────────────────────────────────────────────────────────────

export const TRIGGERS_MAP = {
  ticket_opened: {
    label:       'Ticket aberto',
    description: 'Disparado quando um usuário abre um ticket.',
    value:       'ticket_opened',
  },
  order_paid: {
    label:       'Pedido pago',
    description: 'Disparado quando um pedido tem status alterado para "pago".',
    value:       'order_paid',
  },
  client_registered: {
    label:       'Cliente cadastrado',
    description: 'Disparado quando um novo cliente é registrado.',
    value:       'client_registered',
  },
  proof_created: {
    label:       'Prova criada',
    description: 'Disparado quando uma prova de venda é registrada.',
    value:       'proof_created',
  },
};

export const CONDITION_TYPES = {
  has_role: {
    label:       'Tem cargo',
    description: 'Verifica se o usuário possui um cargo específico.',
    value:       'has_role',
  },
  in_channel: {
    label:       'Em canal específico',
    description: 'Verifica se a ação ocorreu em um canal específico.',
    value:       'in_channel',
  },
  order_status: {
    label:       'Status do pedido',
    description: 'Verifica o status de um pedido.',
    value:       'order_status',
  },
};

export const ACTION_TYPES = {
  send_embed: {
    label:       'Enviar embed',
    description: 'Envia um embed de um modelo para um canal.',
    value:       'send_embed',
  },
  execute_connection: {
    label:       'Executar conexão',
    description: 'Executa uma conexão registrada do servidor.',
    value:       'execute_connection',
  },
  add_role: {
    label:       'Adicionar cargo',
    description: 'Adiciona um cargo ao usuário que disparou o gatilho.',
    value:       'add_role',
  },
  remove_role: {
    label:       'Remover cargo',
    description: 'Remove um cargo do usuário que disparou o gatilho.',
    value:       'remove_role',
  },
  log: {
    label:       'Registrar log',
    description: 'Registra um evento no log de automações do servidor.',
    value:       'log',
  },
};

// ── Helpers de acesso ─────────────────────────────────────────────────────────

export function getTrigger(key) {
  return TRIGGERS_MAP[key] ?? null;
}

export function getTriggers() {
  return Object.values(TRIGGERS_MAP);
}

export function getActionType(key) {
  return ACTION_TYPES[key] ?? null;
}

export function getConditionType(key) {
  return CONDITION_TYPES[key] ?? null;
}

// ── Avaliação de condições ────────────────────────────────────────────────────

/**
 * Avalia uma única condição contra o contexto da execução.
 * Nunca usa eval() ou Function().
 *
 * @param {{ type: string, [key: string]: any }} condition
 * @param {object} context — contexto do gatilho (member, channelId, orderStatus, …)
 * @param {object|null} guild
 * @returns {boolean}
 */
export function evaluateCondition(condition, context, guild = null) {
  if (!condition?.type) return true;

  switch (condition.type) {
    case 'has_role': {
      const member = context?.member ?? null;
      if (!member) return false;
      return member.roles?.cache?.has(condition.roleId) ?? false;
    }
    case 'in_channel': {
      return context?.channelId === condition.channelId;
    }
    case 'order_status': {
      return context?.orderStatus === condition.status;
    }
    default:
      // Condição desconhecida: não bloqueia execução
      return true;
  }
}

/**
 * Avalia um array de condições com AND lógico.
 * Array vazio, null ou undefined retorna true (sem restrições).
 *
 * @param {any[] | null | undefined} conditions
 * @param {object} context
 * @param {object|null} guild
 * @returns {boolean}
 */
export function evaluateConditions(conditions, context, guild = null) {
  if (!Array.isArray(conditions) || conditions.length === 0) return true;
  return conditions.every(c => evaluateCondition(c, context, guild));
}

// ── Builders de embeds ────────────────────────────────────────────────────────

/**
 * Constrói embed de visualização detalhada de uma automação.
 *
 * @param {{ name: string, trigger: string, conditions: any[], actions: any[], enabled: boolean }} automation
 * @returns {EmbedBuilder}
 */
export function buildAutomationEmbed(automation) {
  const triggerLabel = TRIGGERS_MAP[automation.trigger]?.label ?? automation.trigger ?? '—';
  const conds = Array.isArray(automation.conditions) ? automation.conditions.length : 0;
  const acts  = Array.isArray(automation.actions)    ? automation.actions.length    : 0;

  return new EmbedBuilder()
    .setColor(automation.enabled ? 0x57F287 : 0xED4245)
    .setTitle(`⚙️ ${automation.name}`)
    .addFields(
      { name: 'Gatilho',   value: triggerLabel,                                inline: true },
      { name: 'Status',    value: automation.enabled ? '✅ Ativo' : '❌ Inativo', inline: true },
      { name: 'Condições', value: String(conds),                               inline: true },
      { name: 'Ações',     value: String(acts),                                inline: true },
    );
}

/**
 * Constrói embed da listagem de automações do servidor.
 *
 * @param {object[]} automations
 * @returns {EmbedBuilder}
 */
export function buildAutomationListEmbed(automations) {
  const embed = new EmbedBuilder()
    .setColor(0x9B59B6)
    .setTitle('⚙️ Automações Visuais')
    .setDescription(
      automations.length === 0
        ? 'Nenhuma automação configurada. Crie a primeira clicando em **Nova Automação**.'
        : `**${automations.length}** automação(ões) configurada(s).`
    );

  if (automations.length > 0) {
    const lines = automations.map(a => {
      const trig   = TRIGGERS_MAP[a.trigger]?.label ?? a.trigger;
      const status = a.enabled ? '✅' : '❌';
      return `${status} **${a.name}** — ${trig}`;
    });
    embed.addFields({ name: 'Lista', value: lines.join('\n').slice(0, 1024) });
  }

  return embed;
}

/**
 * Monta payload de sucesso (ephemeral).
 * @param {string} message
 */
export function buildSuccessPayload(message) {
  const embed = new EmbedBuilder().setColor(0x57F287).setDescription(`✅ ${message}`);
  return { embeds: [embed], flags: MessageFlags.Ephemeral };
}

/**
 * Monta payload de erro (ephemeral).
 * @param {string} message
 */
export function buildErrorPayload(message) {
  const embed = new EmbedBuilder().setColor(0xED4245).setDescription(`❌ ${message}`);
  return { embeds: [embed], flags: MessageFlags.Ephemeral };
}

// ── Builders de componentes ───────────────────────────────────────────────────

/**
 * Select menu para escolha do gatilho no wizard.
 * @param {string} sessionId
 * @returns {ActionRowBuilder}
 */
export function buildTriggerSelectRow(sessionId) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(build('atm', 'trigger_set', sessionId))
    .setPlaceholder('Selecione o gatilho…')
    .addOptions(
      getTriggers().map(t => ({
        label:       t.label,
        description: t.description.slice(0, 100),
        value:       t.value,
      }))
    );
  return new ActionRowBuilder().addComponents(menu);
}

/**
 * Botão "Nova Automação".
 * @param {string} sessionId
 * @returns {ActionRowBuilder}
 */
export function buildNewAutomationRow(sessionId) {
  const btn = new ButtonBuilder()
    .setCustomId(build('atm', 'create', sessionId))
    .setLabel('Nova Automação')
    .setEmoji('➕')
    .setStyle(ButtonStyle.Primary);
  return new ActionRowBuilder().addComponents(btn);
}

/**
 * Botões de controle da automação (toggle + delete).
 * @param {string} automationId
 * @param {boolean} enabled
 * @returns {ActionRowBuilder}
 */
export function buildAutomationControlRow(automationId, enabled) {
  const toggle = new ButtonBuilder()
    .setCustomId(build('atm', 'toggle', automationId))
    .setLabel(enabled ? 'Desativar' : 'Ativar')
    .setStyle(enabled ? ButtonStyle.Secondary : ButtonStyle.Success);

  const del = new ButtonBuilder()
    .setCustomId(build('atm', 'delete', automationId))
    .setLabel('Excluir')
    .setStyle(ButtonStyle.Danger);

  return new ActionRowBuilder().addComponents(toggle, del);
}
