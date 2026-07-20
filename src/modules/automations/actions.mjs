/**
 * Automações Visuais — Handler do namespace 'atm' (Etapa 16).
 *
 * CustomIds utilizados (todos ≤ 100 chars):
 *   atm:panel:sid            — painel principal (volta ao wizard)
 *   atm:create:sid           — abre modal de criação
 *   atm:modal_submit:sid     — submissão do modal (nome da automação)
 *   atm:trigger_set:sid      — trigger selecionado (select menu)
 *   atm:cond_add:sid         — tipo de condição selecionado
 *   atm:cond_set:sid         — valor/entidade da condição selecionada
 *   atm:cond_remove:sid:idx  — remove condição por índice
 *   atm:action_add:sid       — tipo de ação selecionado
 *   atm:action_set:sid       — valor/entidade da ação selecionada
 *   atm:save:sid             — salva automação
 *   atm:toggle:automId       — ativa/desativa automação (sem sessão)
 *   atm:delete:automId       — pede confirmação de exclusão (sem sessão)
 *   atm:delete_ok:automId    — confirma exclusão (sem sessão)
 *   atm:cancel:sid           — cancela e fecha
 *
 * _getSessionOrFail é async porque faz await de safeReply ao falhar.
 * Todos os 8 handlers que a chamam usam await.
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  MessageFlags,
} from 'discord.js';
import { createSession, getSession, cancelSession } from '../../core/sessionManager.mjs';
import { build }                 from '../../utils/customId.mjs';
import { logger }                from '../../utils/logger.mjs';
import {
  createAutomation,
  getAutomation,
  listAutomations,
  updateAutomation,
  enableAutomation,
  disableAutomation,
  deleteAutomation,
} from '../../database/repositories/Automations.mjs';
import {
  TRIGGERS_MAP,
  ACTION_TYPES,
  CONDITION_TYPES,
  buildAutomationEmbed,
  buildAutomationListEmbed,
  buildTriggerSelectRow,
  buildNewAutomationRow,
  buildAutomationControlRow,
  buildSuccessPayload,
  buildErrorPayload,
} from './flow.mjs';

// ── Helpers de interação ──────────────────────────────────────────────────────

async function safeReply(interaction, content) {
  const payload = typeof content === 'string' ? { content, flags: MessageFlags.Ephemeral } : content;
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  } catch { /* interação expirada */ }
}

async function safeUpdate(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload).catch(() => {});
    } else {
      await interaction.update(payload).catch(() => {});
    }
  } catch { /* expirada */ }
}

// ── _getSessionOrFail — async (await safeReply ao falhar) ────────────────────

/**
 * Obtém a sessão ou responde com erro e retorna null.
 * É async porque executa await safeReply quando a sessão não existe.
 * Todas as 8 chamadas a esta função usam await.
 *
 * @param {import('discord.js').Interaction} interaction
 * @param {string} sessionId
 * @returns {Promise<object|null>}
 */
async function _getSessionOrFail(interaction, sessionId) {
  const session = getSession(sessionId, interaction.user.id, interaction.guildId);
  if (!session) {
    await safeReply(interaction, buildErrorPayload(
      'Sessão expirada ou inválida. Use `/automacoes` para recomeçar.'
    ));
    return null;
  }
  return session;
}

// ── Roteador principal ────────────────────────────────────────────────────────

export async function handleAtmComponent(interaction, action, partes) {
  switch (action) {
    case 'panel':        return handlePanel(interaction, partes);
    case 'create':       return handleCreate(interaction, partes);
    case 'modal_submit': return handleModalSubmit(interaction, partes);
    case 'trigger_set':  return handleTriggerSet(interaction, partes);
    case 'cond_add':     return handleCondAdd(interaction, partes);
    case 'cond_set':     return handleCondSet(interaction, partes);
    case 'cond_remove':  return handleCondRemove(interaction, partes);
    case 'action_add':   return handleActionAdd(interaction, partes);
    case 'action_set':   return handleActionSet(interaction, partes);
    case 'save':         return handleSave(interaction, partes);
    case 'toggle':       return handleToggle(interaction, partes);
    case 'delete':       return handleDelete(interaction, partes);
    case 'delete_ok':    return handleDeleteOk(interaction, partes);
    case 'cancel':       return handleCancel(interaction, partes);
    default:
      logger.warn(`[Automations] Ação desconhecida: '${action}'`);
      await safeReply(interaction, '⚠️ Componente não reconhecido.');
  }
}

// ── Painel principal ──────────────────────────────────────────────────────────

/**
 * Abre o painel de listagem de automações do servidor.
 * Cria uma nova sessão para o wizard.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
export async function openAutomationsPanel(interaction) {
  if (!interaction.guildId) {
    await safeReply(interaction, buildErrorPayload('Este comando só pode ser usado em servidores.'));
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const session = createSession(interaction.user.id, interaction.guildId, 'automations', {
    step:       'list',
    name:       null,
    trigger:    null,
    conditions: [],
    actions:    [],
    editingId:  null,
  });

  const automations = listAutomations(interaction.guildId);
  const embed       = buildAutomationListEmbed(automations);
  const newRow      = buildNewAutomationRow(session.sessionId);

  const components = [newRow];
  await interaction.editReply({ embeds: [embed], components });
}

// ── handlePanel — await _getSessionOrFail (1 de 8) ──────────────────────────

/**
 * Re-renderiza o painel principal do wizard (navegar de volta).
 */
async function handlePanel(interaction, partes) {
  const session = await _getSessionOrFail(interaction, partes[0]); // await (1/8)
  if (!session) return;

  const automations = listAutomations(interaction.guildId);
  const embed       = buildAutomationListEmbed(automations);
  const newRow      = buildNewAutomationRow(session.sessionId);

  await safeUpdate(interaction, { embeds: [embed], components: [newRow] });
}

// ── handleCreate — abre modal (sem _getSessionOrFail) ────────────────────────

async function handleCreate(interaction, partes) {
  const sessionId = partes[0];
  if (!sessionId) {
    await safeReply(interaction, buildErrorPayload('Sessão inválida.'));
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(build('atm', 'modal_submit', sessionId))
    .setTitle('Nova Automação');

  const nameInput = new TextInputBuilder()
    .setCustomId('name')
    .setLabel('Nome da automação')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(80)
    .setPlaceholder('Ex.: Notificar ticket aberto');

  modal.addComponents(new ActionRowBuilder().addComponents(nameInput));

  try {
    await interaction.showModal(modal);
  } catch (err) {
    logger.warn('[Automations] Erro ao abrir modal:', err?.message);
  }
}

// ── handleModalSubmit — cria sessão, avança wizard (sem _getSessionOrFail) ───

async function handleModalSubmit(interaction, partes) {
  const sessionId = partes[0];
  const guildId   = interaction.guildId;

  if (!guildId) {
    await safeReply(interaction, buildErrorPayload('Este comando só pode ser usado em servidores.'));
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const name = interaction.fields.getTextInputValue('name')?.trim();
  if (!name) {
    await interaction.editReply(buildErrorPayload('O nome é obrigatório.'));
    return;
  }

  // Atualiza a sessão existente (criada em openAutomationsPanel)
  const existingSession = getSession(sessionId, interaction.user.id, guildId);
  const session = existingSession ?? createSession(interaction.user.id, guildId, 'automations', {});
  session.data.name = name;
  session.data.step = 'trigger';

  // Avança para seleção de gatilho
  const embed = new EmbedBuilder()
    .setColor(0x9B59B6)
    .setTitle(`⚙️ Nova Automação: ${name}`)
    .setDescription('**Passo 1 de 3 — Selecione o gatilho**\n\nEscolha quando esta automação deve ser ativada:');

  const triggerRow = buildTriggerSelectRow(session.sessionId);
  await interaction.editReply({ embeds: [embed], components: [triggerRow] });
}

// ── handleTriggerSet — await _getSessionOrFail (2 de 8) ──────────────────────

async function handleTriggerSet(interaction, partes) {
  const session = await _getSessionOrFail(interaction, partes[0]); // await (2/8)
  if (!session) return;

  const trigger = interaction.values?.[0];
  if (!trigger || !TRIGGERS_MAP[trigger]) {
    await safeReply(interaction, buildErrorPayload('Gatilho inválido.'));
    return;
  }

  session.data.trigger = trigger;
  session.data.step    = 'conditions';

  await _renderConditionsPanel(interaction, session);
}

// ── handleCondAdd — await _getSessionOrFail (3 de 8) ─────────────────────────

async function handleCondAdd(interaction, partes) {
  const session = await _getSessionOrFail(interaction, partes[0]); // await (3/8)
  if (!session) return;

  // Valor do select: tipo de condição escolhido
  const condType = interaction.values?.[0];
  if (!condType || !CONDITION_TYPES[condType]) {
    await safeReply(interaction, buildErrorPayload('Tipo de condição inválido.'));
    return;
  }

  session.data._pendingCondType = condType;

  // Pede o valor da condição (entidade Discord ou select fixo)
  let row;
  switch (condType) {
    case 'has_role': {
      const menu = new RoleSelectMenuBuilder()
        .setCustomId(build('atm', 'cond_set', session.sessionId))
        .setPlaceholder('Selecione o cargo…');
      row = new ActionRowBuilder().addComponents(menu);
      break;
    }
    case 'in_channel': {
      const menu = new ChannelSelectMenuBuilder()
        .setCustomId(build('atm', 'cond_set', session.sessionId))
        .setPlaceholder('Selecione o canal…');
      row = new ActionRowBuilder().addComponents(menu);
      break;
    }
    case 'order_status': {
      const menu = new StringSelectMenuBuilder()
        .setCustomId(build('atm', 'cond_set', session.sessionId))
        .setPlaceholder('Selecione o status…')
        .addOptions(
          { label: 'Pendente',    value: 'pending'     },
          { label: 'Aguard. pag.', value: 'awaiting_payment' },
          { label: 'Pago',        value: 'paid'        },
          { label: 'Entregue',    value: 'delivered'   },
          { label: 'Cancelado',   value: 'cancelled'   },
        );
      row = new ActionRowBuilder().addComponents(menu);
      break;
    }
    default:
      row = null;
  }

  const embed = new EmbedBuilder()
    .setColor(0x9B59B6)
    .setTitle(`⚙️ ${session.data.name} — Condições`)
    .setDescription(`Configurando condição: **${CONDITION_TYPES[condType].label}**`);

  const components = row ? [row] : [];
  await safeUpdate(interaction, { embeds: [embed], components });
}

// ── handleCondSet — await _getSessionOrFail (4 de 8) ─────────────────────────

async function handleCondSet(interaction, partes) {
  const session = await _getSessionOrFail(interaction, partes[0]); // await (4/8)
  if (!session) return;

  const condType = session.data._pendingCondType;
  if (!condType) {
    await safeReply(interaction, buildErrorPayload('Tipo de condição não encontrado. Tente novamente.'));
    return;
  }

  const value = interaction.values?.[0];
  if (!value) {
    await safeReply(interaction, buildErrorPayload('Nenhum valor selecionado.'));
    return;
  }

  // Constrói a condição
  let condition;
  switch (condType) {
    case 'has_role':    condition = { type: condType, roleId:    value }; break;
    case 'in_channel':  condition = { type: condType, channelId: value }; break;
    case 'order_status':condition = { type: condType, status:    value }; break;
    default:            condition = { type: condType, value };
  }

  if (!Array.isArray(session.data.conditions)) session.data.conditions = [];
  session.data.conditions.push(condition);
  delete session.data._pendingCondType;

  await _renderConditionsPanel(interaction, session);
}

// ── handleCondRemove — await _getSessionOrFail (5 de 8) ──────────────────────

async function handleCondRemove(interaction, partes) {
  const session = await _getSessionOrFail(interaction, partes[0]); // await (5/8)
  if (!session) return;

  const idx = parseInt(partes[1], 10);
  if (!isNaN(idx) && Array.isArray(session.data.conditions)) {
    session.data.conditions.splice(idx, 1);
  }

  await _renderConditionsPanel(interaction, session);
}

// ── handleActionAdd — await _getSessionOrFail (6 de 8) ───────────────────────

async function handleActionAdd(interaction, partes) {
  const session = await _getSessionOrFail(interaction, partes[0]); // await (6/8)
  if (!session) return;

  const actionType = interaction.values?.[0];
  if (!actionType || !ACTION_TYPES[actionType]) {
    await safeReply(interaction, buildErrorPayload('Tipo de ação inválido.'));
    return;
  }

  // 'log' não precisa de configuração extra — adiciona direto
  if (actionType === 'log') {
    if (!Array.isArray(session.data.actions)) session.data.actions = [];
    session.data.actions.push({ type: 'log', message: 'Automação executada.' });
    await _renderActionsPanel(interaction, session);
    return;
  }

  session.data._pendingActionType = actionType;

  let row;
  switch (actionType) {
    case 'add_role':
    case 'remove_role': {
      const menu = new RoleSelectMenuBuilder()
        .setCustomId(build('atm', 'action_set', session.sessionId))
        .setPlaceholder('Selecione o cargo…');
      row = new ActionRowBuilder().addComponents(menu);
      break;
    }
    default:
      // send_embed, execute_connection: simplificado como log até ter seletor completo
      if (!Array.isArray(session.data.actions)) session.data.actions = [];
      session.data.actions.push({ type: actionType });
      delete session.data._pendingActionType;
      await _renderActionsPanel(interaction, session);
      return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x9B59B6)
    .setTitle(`⚙️ ${session.data.name} — Ações`)
    .setDescription(`Configurando ação: **${ACTION_TYPES[actionType].label}**`);

  await safeUpdate(interaction, { embeds: [embed], components: [row] });
}

// ── handleActionSet — await _getSessionOrFail (7 de 8) ───────────────────────

async function handleActionSet(interaction, partes) {
  const session = await _getSessionOrFail(interaction, partes[0]); // await (7/8)
  if (!session) return;

  const actionType = session.data._pendingActionType;
  if (!actionType) {
    await safeReply(interaction, buildErrorPayload('Tipo de ação não encontrado. Tente novamente.'));
    return;
  }

  const value = interaction.values?.[0];
  if (!value) {
    await safeReply(interaction, buildErrorPayload('Nenhum valor selecionado.'));
    return;
  }

  let action;
  switch (actionType) {
    case 'add_role':    action = { type: actionType, roleId: value }; break;
    case 'remove_role': action = { type: actionType, roleId: value }; break;
    default:            action = { type: actionType, value };
  }

  if (!Array.isArray(session.data.actions)) session.data.actions = [];
  session.data.actions.push(action);
  delete session.data._pendingActionType;

  await _renderActionsPanel(interaction, session);
}

// ── handleSave — await _getSessionOrFail (8 de 8) ────────────────────────────

async function handleSave(interaction, partes) {
  const session = await _getSessionOrFail(interaction, partes[0]); // await (8/8)
  if (!session) return;

  const { name, trigger, conditions, actions, editingId } = session.data;

  if (!name || !trigger) {
    await safeReply(interaction, buildErrorPayload('A automação precisa de nome e gatilho.'));
    return;
  }

  await interaction.deferUpdate().catch(() => {});

  try {
    if (editingId) {
      updateAutomation(interaction.guildId, editingId, { name, trigger, conditions, actions });
    } else {
      createAutomation(interaction.guildId, { name, trigger, conditions, actions });
    }

    cancelSession(session.sessionId, interaction.user.id, interaction.guildId);

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('✅ Automação salva!')
      .setDescription(`**${name}** foi salva com sucesso.`);

    await interaction.editReply({ embeds: [embed], components: [] });
  } catch (err) {
    logger.error('[Automations] Erro ao salvar:', err);
    await interaction.editReply(buildErrorPayload('Erro interno ao salvar a automação.'));
  }
}

// ── handleToggle — sem sessão ─────────────────────────────────────────────────

async function handleToggle(interaction, partes) {
  const automationId = partes[0];
  const guildId      = interaction.guildId;

  if (!automationId || !guildId) {
    await safeReply(interaction, buildErrorPayload('Automação inválida.'));
    return;
  }

  await interaction.deferUpdate().catch(() => {});

  const auto = getAutomation(guildId, automationId);
  if (!auto) {
    await interaction.editReply(buildErrorPayload('Automação não encontrada.'));
    return;
  }

  if (auto.enabled) {
    disableAutomation(guildId, automationId);
  } else {
    enableAutomation(guildId, automationId);
  }

  const updated  = getAutomation(guildId, automationId);
  const embed    = buildAutomationEmbed(updated);
  const ctrlRow  = buildAutomationControlRow(automationId, updated.enabled);

  await interaction.editReply({ embeds: [embed], components: [ctrlRow] });
}

// ── handleDelete — sem sessão (pede confirmação) ──────────────────────────────

async function handleDelete(interaction, partes) {
  const automationId = partes[0];
  const guildId      = interaction.guildId;

  if (!automationId || !guildId) {
    await safeReply(interaction, buildErrorPayload('Automação inválida.'));
    return;
  }

  await interaction.deferUpdate().catch(() => {});

  const auto = getAutomation(guildId, automationId);
  if (!auto) {
    await interaction.editReply(buildErrorPayload('Automação não encontrada.'));
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('⚠️ Confirmar exclusão')
    .setDescription(`Deseja realmente excluir a automação **${auto.name}**?\nEsta ação não pode ser desfeita.`);

  const confirmBtn = new ButtonBuilder()
    .setCustomId(build('atm', 'delete_ok', automationId))
    .setLabel('Excluir')
    .setStyle(ButtonStyle.Danger);

  const cancelBtn = new ButtonBuilder()
    .setCustomId(build('atm', 'cancel', automationId))
    .setLabel('Cancelar')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);
  await interaction.editReply({ embeds: [embed], components: [row] });
}

// ── handleDeleteOk — sem sessão ───────────────────────────────────────────────

async function handleDeleteOk(interaction, partes) {
  const automationId = partes[0];
  const guildId      = interaction.guildId;

  if (!automationId || !guildId) {
    await safeReply(interaction, buildErrorPayload('Automação inválida.'));
    return;
  }

  await interaction.deferUpdate().catch(() => {});

  const auto    = getAutomation(guildId, automationId);
  const deleted = deleteAutomation(guildId, automationId);

  if (!deleted) {
    await interaction.editReply(buildErrorPayload('Automação não encontrada ou já excluída.'));
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setDescription(`✅ Automação **${auto?.name ?? automationId}** excluída com sucesso.`);

  await interaction.editReply({ embeds: [embed], components: [] });
}

// ── handleCancel — sem _getSessionOrFail ──────────────────────────────────────

async function handleCancel(interaction, partes) {
  const sessionId = partes[0];
  if (sessionId) {
    cancelSession(sessionId, interaction.user.id, interaction.guildId);
  }

  await safeUpdate(interaction, {
    content:    '❌ Operação cancelada.',
    embeds:     [],
    components: [],
  });
}

// ── Renderers internos ────────────────────────────────────────────────────────

async function _renderConditionsPanel(interaction, session) {
  const conditions = session.data.conditions ?? [];
  const condLines  = conditions.length
    ? conditions.map((c, i) => {
        const label = CONDITION_TYPES[c.type]?.label ?? c.type;
        const val   = c.roleId ?? c.channelId ?? c.status ?? c.value ?? '—';
        return `${i + 1}. **${label}**: \`${val}\``;
      }).join('\n')
    : '_Nenhuma condição — a automação sempre executa._';

  const embed = new EmbedBuilder()
    .setColor(0x9B59B6)
    .setTitle(`⚙️ ${session.data.name} — Passo 2: Condições`)
    .setDescription(condLines);

  // Select de tipo de condição
  const condTypeMenu = new StringSelectMenuBuilder()
    .setCustomId(build('atm', 'cond_add', session.sessionId))
    .setPlaceholder('Adicionar condição…')
    .addOptions(
      Object.values(CONDITION_TYPES).map(c => ({
        label: c.label, description: c.description.slice(0, 100), value: c.value,
      }))
    );
  const condRow = new ActionRowBuilder().addComponents(condTypeMenu);

  // Botão "Próximo" → abre painel de ações
  const nextBtn = new ButtonBuilder()
    .setCustomId(build('atm', 'action_add', session.sessionId))
    .setLabel('Próximo: Ações →')
    .setStyle(ButtonStyle.Primary);

  // Botão "Remover última condição" (se houver)
  const components = [condRow];
  if (conditions.length > 0) {
    const removeBtn = new ButtonBuilder()
      .setCustomId(build('atm', 'cond_remove', session.sessionId, String(conditions.length - 1)))
      .setLabel('Remover última condição')
      .setStyle(ButtonStyle.Danger);
    components.push(new ActionRowBuilder().addComponents(removeBtn, nextBtn));
  } else {
    components.push(new ActionRowBuilder().addComponents(nextBtn));
  }

  await safeUpdate(interaction, { embeds: [embed], components });
}

async function _renderActionsPanel(interaction, session) {
  const actions  = session.data.actions ?? [];
  const actLines = actions.length
    ? actions.map((a, i) => {
        const label = ACTION_TYPES[a.type]?.label ?? a.type;
        const val   = a.roleId ?? a.channelId ?? a.message ?? a.value ?? '';
        return `${i + 1}. **${label}**${val ? `: \`${val}\`` : ''}`;
      }).join('\n')
    : '_Nenhuma ação configurada ainda._';

  const embed = new EmbedBuilder()
    .setColor(0x9B59B6)
    .setTitle(`⚙️ ${session.data.name} — Passo 3: Ações`)
    .setDescription(actLines);

  // Select de tipo de ação
  const actionTypeMenu = new StringSelectMenuBuilder()
    .setCustomId(build('atm', 'action_add', session.sessionId))
    .setPlaceholder('Adicionar ação…')
    .addOptions(
      Object.values(ACTION_TYPES).map(a => ({
        label: a.label, description: a.description.slice(0, 100), value: a.value,
      }))
    );
  const actionRow = new ActionRowBuilder().addComponents(actionTypeMenu);

  // Botão "Salvar"
  const saveBtn = new ButtonBuilder()
    .setCustomId(build('atm', 'save', session.sessionId))
    .setLabel('💾 Salvar Automação')
    .setStyle(ButtonStyle.Success);

  const components = [actionRow, new ActionRowBuilder().addComponents(saveBtn)];
  await safeUpdate(interaction, { embeds: [embed], components });
}
