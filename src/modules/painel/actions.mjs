/**
 * Painel Central — Handler de componentes (namespace 'painel').
 *
 * O painel é um HUB de navegação — NÃO reimplementa a lógica dos módulos.
 * Cada botão chama a função pública do módulo correspondente.
 *
 * Fluxo:
 *   /painel → openPainel → embed ephemeral com botões de módulos
 *   Botão "Conexões" → deferUpdate + openConexoesPanel (followUp)
 *   Botão "Tickets"  → deferUpdate + openTicketsPanel  (followUp)
 *   etc.
 *
 * Usar deferUpdate (em vez de reply/update) preserva a mensagem do painel
 * e faz o módulo abrir em uma nova mensagem ephemeral via followUp.
 *
 * CustomIds do painel (todos stateless, sem sessão):
 *   painel:embed
 *   painel:modelos
 *   painel:conexoes
 *   painel:tickets
 *   painel:pedidos
 *   painel:clientes
 *   painel:proofs
 *   painel:automacoes     ← adicionado na Etapa 19D
 *   painel:paineis        ← adicionado na Etapa 19D
 *   painel:produtos       ← adicionado na Etapa 19D
 *   painel:stats
 *   painel:cancel
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { logger }               from '../../utils/logger.mjs';
import { hasModulePermission, buildDeniedMessage } from '../../database/repositories/Permissions.mjs';
import { openConexoesPanel }    from '../connections/index.mjs';
import { openTicketsPanel }     from '../tickets/index.mjs';
import { openClientsList }      from '../clients/index.mjs';
import { openTemplatesPanel }   from '../templates/index.mjs';
import { openEmbedPanel }       from '../embed/index.mjs';
import { openOrdersList }       from '../orders/index.mjs';
import { openProofsList }       from '../proofs/index.mjs';
import { openAutomationsPanel } from '../automations/actions.mjs';
import { openCustomPanelsManager } from '../custompanels/index.mjs';
import { openProductsManager }  from '../products/index.mjs';

// ── Handler principal ─────────────────────────────────────────────────────────

export async function handlePainelComponent(interaction, action) {
  switch (action) {
    case 'embed':      return handleModule(interaction, 'embeds',      openEmbedPanel);
    case 'modelos':    return handleModule(interaction, 'modelos',     openTemplatesPanel);
    case 'conexoes':   return handleModule(interaction, 'conexoes',    openConexoesPanel);
    case 'tickets':    return handleModule(interaction, 'tickets',     openTicketsPanel);
    case 'pedidos':    return handleModule(interaction, 'pedidos',     openOrdersList);
    case 'clientes':   return handleModule(interaction, 'clientes',    openClientsList);
    case 'proofs':     return handleModule(interaction, 'proofs',      openProofsList);
    case 'automacoes': return handleModule(interaction, 'automacoes',  openAutomationsPanel);
    case 'paineis':    return handleModule(interaction, 'paineis',     openCustomPanelsManager);
    case 'produtos':   return handleModule(interaction, 'produtos',    openProductsManager);
    case 'stats':      return handleStats(interaction);
    case 'cancel':     return handleCancel(interaction);
    default:
      logger.warn(`[Painel] Ação desconhecida: '${action}'`);
      return safeReply(interaction, '⚠️ Ação não reconhecida.');
  }
}

// ── Abertura pública ──────────────────────────────────────────────────────────

/**
 * Abre o painel central. Chamado pelo comando /painel.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
export async function openPainel(interaction) {
  const payload = buildPainelPayload();

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({ ...payload, flags: MessageFlags.Ephemeral });
  } else {
    await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
  }
}

// ── Handlers internos ─────────────────────────────────────────────────────────

/**
 * Abre um módulo via painel:
 *   1. Verifica permissão do usuário
 *   2. deferUpdate (mantém a mensagem do painel)
 *   3. Chama a função do módulo (que usa followUp)
 */
async function handleModule(interaction, moduleName, openFn) {
  if (!hasModulePermission(interaction.member, interaction.guildId, moduleName)) {
    return safeReply(interaction, buildDeniedMessage(moduleName));
  }

  await interaction.deferUpdate();

  try {
    await openFn(interaction);
  } catch (err) {
    logger.error(`[Painel] Erro ao abrir módulo '${moduleName}':`, err);
    try {
      await interaction.followUp({
        content: `❌ Erro ao abrir o módulo **${moduleName}**: ${err.message}`,
        flags: MessageFlags.Ephemeral,
      });
    } catch { /* interação já expirou */ }
  }
}

/**
 * Exibe um resumo de estatísticas inline no painel.
 * Inclui todos os módulos: tickets, pedidos, provas, clientes, conexões,
 * modelos, automações, painéis personalizados e produtos.
 */
async function handleStats(interaction) {
  if (!hasModulePermission(interaction.member, interaction.guildId, 'stats')) {
    return safeReply(interaction, buildDeniedMessage('stats'));
  }

  await interaction.deferUpdate();

  // Importações dinâmicas para evitar acoplamento circular no boot
  const { countOpenTickets, listTickets } = await import('../../database/repositories/Tickets.mjs');
  const { countOrders }                   = await import('../../database/repositories/Orders.mjs');
  const { countProofs }                   = await import('../../database/repositories/Proofs.mjs');
  const { countClients }                  = await import('../../database/repositories/Clients.mjs');
  const { listConnections }               = await import('../../database/repositories/Connections.mjs');
  const { listTemplates }                 = await import('../../database/repositories/Templates.mjs');
  const { listAutomations }               = await import('../../database/repositories/Automations.mjs');
  const { listPanels }                    = await import('../../database/repositories/CustomPanels.mjs');
  const { listProducts }                  = await import('../../database/repositories/Products.mjs');

  const guildId = interaction.guildId;

  try {
    const openTickets  = countOpenTickets(guildId);
    const closedList   = listTickets(guildId, { status: 'closed' });
    const totalOrders  = countOrders(guildId);
    const doneOrders   = countOrders(guildId, { status: 'completed' });
    const totalProofs  = countProofs(guildId);
    const totalClients = countClients(guildId);
    const allConns     = listConnections(guildId);
    const activeConns  = allConns.filter(c => c.enabled).length;
    const templates    = listTemplates(guildId);
    const automations  = listAutomations(guildId);
    const activeAutoms = automations.filter(a => a.enabled).length;
    const panels       = listPanels(guildId);
    const products     = listProducts(guildId);
    const activeProds  = products.filter(p => p.status === 'active').length;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📊 Estatísticas do Servidor')
      .addFields(
        { name: '🎫 Tickets Abertos',     value: String(openTickets),      inline: true },
        { name: '🔒 Tickets Fechados',    value: String(closedList.length), inline: true },
        { name: '🛒 Pedidos (total)',      value: String(totalOrders),       inline: true },
        { name: '🏆 Pedidos Concluídos',  value: String(doneOrders),        inline: true },
        { name: '📋 Provas de Venda',     value: String(totalProofs),        inline: true },
        { name: '👤 Clientes',            value: String(totalClients),       inline: true },
        { name: '🔗 Conexões Ativas',     value: `${activeConns}/${allConns.length}`, inline: true },
        { name: '📦 Modelos Salvos',      value: String(templates.length),   inline: true },
        { name: '⚡ Automações Ativas',   value: `${activeAutoms}/${automations.length}`, inline: true },
        { name: '🖼️ Painéis Criados',    value: String(panels.length),      inline: true },
        { name: '🏪 Produtos Ativos',     value: `${activeProds}/${products.length}`, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: `Ruby FY • ${interaction.guild?.name ?? guildId}` });

    await interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
  } catch (err) {
    logger.error('[Painel] Erro ao gerar estatísticas:', err);
    await interaction.followUp({ content: '❌ Erro ao carregar estatísticas.', flags: MessageFlags.Ephemeral });
  }
}

function handleCancel(interaction) {
  return interaction.update({
    embeds: [],
    components: [],
    content: '❌ Painel fechado.',
  });
}

// ── Construtor do painel ──────────────────────────────────────────────────────

function buildPainelPayload() {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('💜 Ruby FY — Painel Central')
    .setDescription(
      'Bem-vindo ao painel de controle do Ruby FY.\n' +
      'Selecione um módulo para começar:\n\n' +
      '**🎨 Embeds** — editor visual de embeds\n' +
      '**📦 Modelos** — modelos reutilizáveis\n' +
      '**🔗 Conexões** — automações de mensagens\n' +
      '**🎫 Tickets** — configuração de atendimento\n' +
      '**🛒 Pedidos** — gestão de pedidos\n' +
      '**👤 Clientes** — CRM e cadastro\n' +
      '**📋 Provas** — provas de venda\n' +
      '**⚡ Automações** — gatilhos e ações automáticas\n' +
      '**🖼️ Painéis** — painéis personalizados com botões\n' +
      '**🏪 Produtos** — catálogo e estoque\n' +
      '**📊 Stats** — estatísticas do servidor',
    );

  // Linha 1 — Embeds, Modelos, Conexões, Tickets, Pedidos
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('painel:embed')
      .setLabel('Embeds')
      .setEmoji('🎨')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('painel:modelos')
      .setLabel('Modelos')
      .setEmoji('📦')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('painel:conexoes')
      .setLabel('Conexões')
      .setEmoji('🔗')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('painel:tickets')
      .setLabel('Tickets')
      .setEmoji('🎫')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('painel:pedidos')
      .setLabel('Pedidos')
      .setEmoji('🛒')
      .setStyle(ButtonStyle.Secondary),
  );

  // Linha 2 — Clientes, Provas, Automações, Painéis, Produtos
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('painel:clientes')
      .setLabel('Clientes')
      .setEmoji('👤')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('painel:proofs')
      .setLabel('Provas')
      .setEmoji('📋')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('painel:automacoes')
      .setLabel('Automações')
      .setEmoji('⚡')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('painel:paineis')
      .setLabel('Painéis')
      .setEmoji('🖼️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('painel:produtos')
      .setLabel('Produtos')
      .setEmoji('🏪')
      .setStyle(ButtonStyle.Secondary),
  );

  // Linha 3 — Stats e Fechar
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('painel:stats')
      .setLabel('Stats')
      .setEmoji('📊')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('painel:cancel')
      .setLabel('Fechar')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger),
  );

  return { embeds: [embed], components: [row1, row2, row3] };
}

// ── Utilitário ────────────────────────────────────────────────────────────────

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
