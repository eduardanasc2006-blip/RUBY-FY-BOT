/**
 * Módulo de Modelos — Handler de componentes interativos.
 *
 * Registrado no namespace 'templates' do componentHandler.
 *
 * CustomIds utilizados:
 *   templates:open:sessionId            — painel principal
 *   templates:create:sessionId          — seleção de tipo
 *   templates:embed:sessionId           — abre editor de template embed
 *   templates:list:sessionId            — lista de modelos
 *   templates:pick:sessionId            — select menu de modelo selecionado
 *   templates:view:sessionId:modelId    — detalhe de um modelo
 *   templates:edit:sessionId:modelId    — abre editor com dados do modelo
 *   templates:dupe:sessionId:modelId    — duplica modelo
 *   templates:del:sessionId:modelId     — confirmação de exclusão
 *   templates:del_ok:sessionId:modelId  — executa exclusão
 *   templates:cancel:sessionId          — cancela e fecha o painel
 *   templates:save_modal:sessionId      — abre modal nome+descrição (editor session)
 *   templates:save_submit:sessionId     — salva o modelo (modal submit)
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} from 'discord.js';
import { createSession, getSession, cancelSession } from '../../core/sessionManager.mjs';
import { setDefinition, removeDefinition } from '../editor/actions.mjs';
import { renderPanel } from '../editor/renderer.mjs';
import { createEmbedTemplateDefinition, buildEmbed } from './definition.mjs';
import {
  createTemplate,
  getTemplate,
  listTemplates,
  updateTemplate,
  duplicateTemplate,
  deleteTemplate,
} from '../../database/repositories/Templates.mjs';
import { build } from '../../utils/customId.mjs';
import { logger } from '../../utils/logger.mjs';

// ── Handler principal ─────────────────────────────────────────────────────────

export async function handleTemplatesComponent(interaction, action, partes) {
  const sessionId = partes[0];
  const modelId   = partes[1] ?? null;

  if (!sessionId) return safeReply(interaction, '⚠️ Sessão inválida.');

  const session = getSession(sessionId, interaction.user.id, interaction.guildId);
  if (!session) {
    return safeReply(interaction, '⚠️ Esta sessão expirou ou não pertence a você. Use `/modelos` para abrir novamente.');
  }

  switch (action) {
    case 'open':        return handleOpen(interaction, session);
    case 'create':      return handleCreate(interaction, session);
    case 'embed':       return handleCreateEmbed(interaction, session);
    case 'list':        return handleList(interaction, session);
    case 'pick':        return handlePick(interaction, session);
    case 'view':        return handleView(interaction, session, modelId);
    case 'edit':        return handleEdit(interaction, session, modelId);
    case 'dupe':        return handleDupe(interaction, session, modelId);
    case 'del':         return handleDel(interaction, session, modelId);
    case 'del_ok':      return handleDelOk(interaction, session, modelId);
    case 'cancel':      return handleCancel(interaction, session);
    case 'save_modal':  return handleSaveModal(interaction, session);
    case 'save_submit': return handleSaveSubmit(interaction, session);
    default:
      logger.warn(`[Templates] Ação desconhecida: '${action}'`);
      return safeReply(interaction, '⚠️ Ação não reconhecida.');
  }
}

// ── Abertura pública (chamada pelo comando /modelos) ──────────────────────────

/**
 * Cria uma sessão de templates e exibe o painel principal.
 * @param {import('discord.js').Interaction} interaction
 */
export async function openTemplatesPanel(interaction) {
  const session = createSession(interaction.user.id, interaction.guildId, 'templates', {});
  const panel   = buildMainPanel(session.sessionId);

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({ ...panel, flags: MessageFlags.Ephemeral });
  } else {
    await interaction.reply({ ...panel, flags: MessageFlags.Ephemeral });
  }
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleOpen(interaction, session) {
  return interaction.update(buildMainPanel(session.sessionId));
}

async function handleCreate(interaction, session) {
  return interaction.update(buildTypePanel(session.sessionId));
}

async function handleCreateEmbed(interaction, session) {
  const definition   = createEmbedTemplateDefinition();
  const editorSession = createSession(interaction.user.id, interaction.guildId, 'embed_template', {});
  setDefinition(editorSession.sessionId, definition);
  return interaction.update(renderPanel(editorSession, definition));
}

async function handleList(interaction, session) {
  const templates = listTemplates(interaction.guildId);
  return interaction.update(buildListPanel(session.sessionId, templates));
}

async function handlePick(interaction, session) {
  const modelId = interaction.values?.[0];
  if (!modelId) return safeReply(interaction, '⚠️ Nenhum modelo selecionado.');
  return handleView(interaction, session, modelId);
}

async function handleView(interaction, session, modelId) {
  if (!modelId) return safeReply(interaction, '⚠️ ID do modelo ausente.');
  const template = getTemplate(interaction.guildId, modelId);
  if (!template) return safeReply(interaction, '⚠️ Modelo não encontrado.');
  return interaction.update(buildViewPanel(session.sessionId, template));
}

async function handleEdit(interaction, session, modelId) {
  if (!modelId) return safeReply(interaction, '⚠️ ID do modelo ausente.');
  const template = getTemplate(interaction.guildId, modelId);
  if (!template) return safeReply(interaction, '⚠️ Modelo não encontrado.');

  const definition    = createEmbedTemplateDefinition();
  const initialData   = {
    ...template.data,
    _templateId:          template.id,
    _templateName:        template.name,
    _templateDescription: template.description ?? '',
  };
  const editorSession = createSession(interaction.user.id, interaction.guildId, 'embed_template', initialData);
  setDefinition(editorSession.sessionId, definition);
  return interaction.update(renderPanel(editorSession, definition));
}

async function handleDupe(interaction, session, modelId) {
  if (!modelId) return safeReply(interaction, '⚠️ ID do modelo ausente.');
  const copy = duplicateTemplate(interaction.guildId, modelId);
  if (!copy) return safeReply(interaction, '⚠️ Modelo original não encontrado.');

  logger.info(`[Templates] Modelo duplicado — guild: ${interaction.guildId} | novo id: ${copy.id}`);
  const templates = listTemplates(interaction.guildId);
  return interaction.update({
    ...buildListPanel(session.sessionId, templates),
    content: `✅ Modelo **${copy.name}** criado com sucesso!`,
  });
}

async function handleDel(interaction, session, modelId) {
  if (!modelId) return safeReply(interaction, '⚠️ ID do modelo ausente.');
  const template = getTemplate(interaction.guildId, modelId);
  if (!template) return safeReply(interaction, '⚠️ Modelo não encontrado.');
  return interaction.update(buildDeletePanel(session.sessionId, template));
}

async function handleDelOk(interaction, session, modelId) {
  if (!modelId) return safeReply(interaction, '⚠️ ID do modelo ausente.');
  const template = getTemplate(interaction.guildId, modelId);
  const deleted  = deleteTemplate(interaction.guildId, modelId);

  if (!deleted) return safeReply(interaction, '⚠️ Modelo não encontrado ou já foi excluído.');

  logger.info(`[Templates] Modelo excluído — guild: ${interaction.guildId} | id: ${modelId}`);
  const templates = listTemplates(interaction.guildId);
  return interaction.update({
    ...buildListPanel(session.sessionId, templates),
    content: template ? `🗑️ Modelo **${template.name}** excluído.` : '🗑️ Modelo excluído.',
  });
}

async function handleCancel(interaction, session) {
  cancelSession(session.sessionId, interaction.user.id, interaction.guildId);
  return interaction.update({ embeds: [], components: [], content: '❌ Painel de modelos fechado.' });
}

// ── Salvar modelo (chamado a partir de um editor session) ─────────────────────

async function handleSaveModal(interaction, session) {
  // session aqui é a sessão do editor (embed_template)
  const name        = session.data._templateName        ?? '';
  const description = session.data._templateDescription ?? '';

  const modal = new ModalBuilder()
    .setCustomId(build('templates', 'save_submit', session.sessionId))
    .setTitle('Salvar Modelo')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('tmpl_name')
          .setLabel('Nome do Modelo')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
          .setValue(name)
          .setPlaceholder('Ex: Proof de Venda'),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('tmpl_desc')
          .setLabel('Descrição (opcional)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(200)
          .setValue(description)
          .setPlaceholder('Breve descrição do modelo'),
      ),
    );

  return interaction.showModal(modal);
}

async function handleSaveSubmit(interaction, session) {
  const name        = interaction.fields.getTextInputValue('tmpl_name')?.trim();
  const description = interaction.fields.getTextInputValue('tmpl_desc')?.trim() || null;

  if (!name) return safeReply(interaction, '⚠️ O nome do modelo é obrigatório.');

  const guildId    = interaction.guildId;
  const templateId = session.data._templateId ?? null;

  // Remove campos internos antes de persistir
  const data = { ...session.data };
  delete data._templateId;
  delete data._templateName;
  delete data._templateDescription;

  let savedName;
  if (templateId) {
    // Atualiza modelo existente
    const updated = updateTemplate(guildId, templateId, { name, description, data });
    savedName = updated?.name ?? name;
    logger.info(`[Templates] Modelo atualizado — guild: ${guildId} | id: ${templateId}`);
  } else {
    // Cria novo modelo
    const created = createTemplate(guildId, { name, description, type: 'embed', data });
    savedName = created.name;
    logger.info(`[Templates] Modelo criado — guild: ${guildId} | id: ${created.id}`);
  }

  // Encerra a sessão do editor
  cancelSession(session.sessionId, interaction.user.id, guildId);
  removeDefinition(session.sessionId);

  // Modal submit → usa reply ephemeral
  return interaction.reply({
    content: `✅ Modelo **${savedName}** salvo com sucesso! Use \`/modelos\` para gerenciá-lo.`,
    flags: MessageFlags.Ephemeral,
  });
}

// ── Construtores de painel ────────────────────────────────────────────────────

function buildMainPanel(sessionId) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('📚 Modelos Salvos')
    .setDescription(
      'Gerencie os modelos de mensagens reutilizáveis do seu servidor.\n\n' +
      '**➕ Criar Modelo** — cria e salva um novo modelo\n' +
      '**📋 Meus Modelos** — visualiza, edita, duplica e exclui modelos',
    );

  const components = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(build('templates', 'create', sessionId))
        .setLabel('Criar Modelo')
        .setEmoji('➕')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(build('templates', 'list', sessionId))
        .setLabel('Meus Modelos')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(build('templates', 'cancel', sessionId))
        .setLabel('Fechar')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];

  return { embeds: [embed], components };
}

function buildTypePanel(sessionId) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('➕ Criar Modelo')
    .setDescription('Escolha o tipo de modelo que deseja criar:');

  const components = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(build('templates', 'embed', sessionId))
        .setLabel('Embed')
        .setEmoji('📦')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(build('templates', 'open', sessionId))
        .setLabel('Voltar')
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(build('templates', 'cancel', sessionId))
        .setLabel('Cancelar')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];

  return { embeds: [embed], components };
}

function buildListPanel(sessionId, templates) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('📋 Meus Modelos')
    .setFooter({ text: `${templates.length}/∞ modelo(s)` });

  const components = [];

  if (templates.length === 0) {
    embed.setDescription('Nenhum modelo salvo ainda.\nClique em **➕ Criar Modelo** para começar.');
  } else {
    embed.setDescription(`**${templates.length} modelo(s) encontrado(s).** Selecione para ver os detalhes.`);

    // Select menu (até 25 opções — limite do Discord)
    const visibleTemplates = templates.slice(0, 25);
    components.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(build('templates', 'pick', sessionId))
          .setPlaceholder('Selecione um modelo...')
          .addOptions(
            visibleTemplates.map(t => ({
              label:       t.name.slice(0, 100),
              value:       t.id,
              description: (t.description ?? `Tipo: ${t.type}`).slice(0, 100),
              emoji:       t.type === 'embed' ? '📦' : '📄',
            })),
          ),
      ),
    );
  }

  components.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(build('templates', 'open', sessionId))
        .setLabel('Voltar')
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(build('templates', 'cancel', sessionId))
        .setLabel('Fechar')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return { embeds: [embed], components };
}

function buildViewPanel(sessionId, template) {
  // Embed de metadados
  const infoEmbed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`📦 ${template.name}`)
    .addFields(
      { name: 'Tipo',       value: template.type,    inline: true },
      { name: 'Criado em',  value: formatDate(template.created_at),  inline: true },
      { name: 'Atualizado', value: formatDate(template.updated_at),  inline: true },
    );
  if (template.description) infoEmbed.setDescription(template.description);

  // Embed de prévia (pode falhar se dados inválidos — exibe só a info)
  const embeds = [infoEmbed];
  try {
    const def = createEmbedTemplateDefinition();
    const previewResult = def.renderPreview(template.data);
    if (previewResult?.embeds?.[0]) {
      previewResult.embeds[0].setFooter({ text: '👁️ Prévia do modelo' });
      embeds.push(previewResult.embeds[0]);
    }
  } catch { /* ignora falha de prévia */ }

  const components = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(build('templates', 'edit', sessionId, template.id))
        .setLabel('Editar')
        .setEmoji('✏️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(build('templates', 'dupe', sessionId, template.id))
        .setLabel('Duplicar')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(build('templates', 'del', sessionId, template.id))
        .setLabel('Excluir')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(build('templates', 'list', sessionId))
        .setLabel('Voltar')
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];

  return { embeds, components };
}

function buildDeletePanel(sessionId, template) {
  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('⚠️ Confirmar Exclusão')
    .setDescription(
      `Tem certeza que deseja excluir o modelo **${template.name}**?\n\n` +
      '⚠️ Esta ação **não pode ser desfeita**.',
    );

  const components = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(build('templates', 'del_ok', sessionId, template.id))
        .setLabel('Confirmar Exclusão')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(build('templates', 'view', sessionId, template.id))
        .setLabel('Cancelar')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];

  return { embeds: [embed], components };
}

// ── Utilitários ───────────────────────────────────────────────────────────────

function formatDate(unixSeconds) {
  if (!unixSeconds) return '—';
  return new Date(unixSeconds * 1000).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

async function safeReply(interaction, content) {
  const payload = { content, flags: MessageFlags.Ephemeral };
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  } catch { /* expirada ou já respondida */ }
}
