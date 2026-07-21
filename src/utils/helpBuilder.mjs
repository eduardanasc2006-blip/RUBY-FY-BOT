/**
 * Construtor de Menu de Ajuda Dinâmico.
 *
 * Gera automaticamente a lista de comandos organizados por categoria,
 * lendo os comandos registrados no client.
 *
 * Uso:
 *   import { buildHelpEmbed, buildHelpPages } from '../utils/helpBuilder.mjs';
 *   const embed = buildHelpEmbed(client, interaction);
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

/**
 * Mapeamento de comandos para categorias.
 * Novos comandos são automaticamente categorizados ao serem adicionados.
 */
export const COMMAND_CATEGORIES = {
  // Administração
  painel:       'administração',
  painelcentral:'administração',
  stats:        'administração',
  auditoria:    'administração',

  // Configuração
  embed:        'configuração',
  variaveis:    'configuração',
  autorole:     'configuração',

  // Gerenciamento
  paineis:      'gerenciamento',
  modelos:      'gerenciamento',
  conexoes:     'gerenciamento',
  automacoes:   'gerenciamento',
  comandos:     'gerenciamento',

  // Tickets
  ticket:       'tickets',
  tickets:      'tickets',

  // Produtos
  produto:      'produtos',
  estoque:      'produtos',

  // Clientes
  cliente:      'clientes',

  // Pedidos
  pedido:       'pedidos',

  // Provas
  proof:        'provas',

  // Utilidades
  ping:         'utilidades',
  ajuda:        'utilidades',
};

/**
 * Nomes das categorias em ordem de exibição.
 */
export const CATEGORY_ORDER = [
  'administração',
  'configuração',
  'gerenciamento',
  'tickets',
  'produtos',
  'clientes',
  'pedidos',
  'provas',
  'utilidades',
];

/**
 * Emojis para cada categoria.
 */
export const CATEGORY_EMOJIS = {
  'administração': '⚙️',
  'configuração':  '🔧',
  'gerenciamento': '📋',
  'tickets':       '🎫',
  'produtos':      '🛒',
  'clientes':      '👥',
  'pedidos':       '📦',
  'provas':        '📜',
  'utilidades':    '🔧',
};

/**
 * Descrições das categorias.
 */
export const CATEGORY_DESCRIPTIONS = {
  'administração': 'Comandos para gerenciar e monitorar o servidor',
  'configuração':  'Configure variáveis, embeds e funcionalidades',
  'gerenciamento': 'Gerencie painéis, modelos, conexões e automações',
  'tickets':      'Sistema de atendimento e suporte',
  'produtos':     'Catálogo de produtos do servidor',
  'clientes':     'Cadastro e gestão de clientes',
  'pedidos':      'Registro e acompanhamento de vendas',
  'provas':       'Provas de pagamento e entrega',
  'utilidades':   'Ferramentas úteis do bot',
};

/**
 * Constrói o menu de ajuda completo.
 *
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').ChatInputCommandInteraction} [interaction]
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
export function buildHelpMenu(client, interaction = null) {
  // Coleta comandos do client
  const commands = Array.from(client.commands.values());

  // Agrupa por categoria
  const categories = {};
  for (const cmd of commands) {
    const name = cmd.data?.name;
    if (!name || name === 'ajuda') continue; // Pula o próprio comando de ajuda

    const category = COMMAND_CATEGORIES[name] || 'utilidades';

    if (!categories[category]) {
      categories[category] = [];
    }

    categories[category].push({
      name: name,
      description: cmd.data?.description || 'Sem descrição',
    });
  }

  // Ordena categorias
  const sortedCategories = CATEGORY_ORDER.filter(c => categories[c]);

  // Se nenhuma categoria encontrada, adiciona utilitários com o que houver
  if (sortedCategories.length === 0) {
    sortedCategories.push('utilidades');
    categories['utilidades'] = commands
      .filter(c => c.data?.name && c.data?.name !== 'ajuda')
      .map(c => ({
        name: c.data.name,
        description: c.data.description || 'Sem descrição',
      }));
  }

  // Constrói embeds por categoria
  const embeds = [];
  const categoryNames = Object.keys(categories);

  for (let i = 0; i < categoryNames.length; i++) {
    const category = categoryNames[i];
    const cmds = categories[category];
    const emoji = CATEGORY_EMOJIS[category] || '📌';
    const desc = CATEGORY_DESCRIPTIONS[category] || '';

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${emoji} ${category.charAt(0).toUpperCase() + category.slice(1)}`)
      .setDescription(desc)
      .setTimestamp();

    // Adiciona comandos em fields (máximo 25 fields por embed)
    for (const cmd of cmds) {
      embed.addFields([{
        name: `/${cmd.name}`,
        value: cmd.description.slice(0, 100),
        inline: true,
      }]);
    }

    // Footer na primeira página
    if (i === 0) {
      embed.setFooter({
        text: `${client.user?.username || 'Bot'} • ${cmds.length} comando(s) • Use /ajuda para mais informações`,
      });
    }

    embeds.push(embed);
  }

  // Se múltiplas páginas, adiciona navegação
  const components = [];
  if (embeds.length > 1) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('help:page:prev')
        .setLabel('◀️ Anterior')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('help:page:next')
        .setLabel('Próxima ▶️')
        .setStyle(ButtonStyle.Secondary),
    );
    components.push(row);
  }

  return { embeds, components };
}

/**
 * Constrói um embed de ajuda simplificado (para prefix commands).
 *
 * @param {import('discord.js').Client} client
 * @param {string} prefix
 * @returns {EmbedBuilder}
 */
export function buildSimpleHelpEmbed(client, prefix) {
  const commands = Array.from(client.commands.values())
    .filter(c => c.data?.name && c.data?.name !== 'ajuda');

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`${client.user?.username || 'Bot'} — Central de Ajuda`)
    .setDescription('Use `/comando` para ver detalhes de cada comando.')
    .setTimestamp()
    .setFooter({ text: `${commands.length} comando(s) disponível(s)` });

  // Lista comandos por categoria
  const byCategory = {};
  for (const cmd of commands) {
    const name = cmd.data.name;
    const category = COMMAND_CATEGORIES[name] || 'utilidades';
    if (!byCategory[category]) byCategory[category] = [];
    byCategory[category].push(`\`/${name}\``);
  }

  for (const catName of CATEGORY_ORDER) {
    if (byCategory[catName]) {
      const emoji = CATEGORY_EMOJIS[catName] || '📌';
      embed.addFields([{
        name: `${emoji} ${catName.charAt(0).toUpperCase() + catName.slice(1)}`,
        value: byCategory[catName].join(' ') || 'Nenhum',
        inline: false,
      }]);
    }
  }

  return embed;
}

/**
 * Atualiza o menu de ajuda existente.
 *
 * @param {import('discord.js').Message} message
 * @param {import('discord.js').Client} client
 * @returns {Promise<void>}
 */
export async function updateHelpMessage(message, client) {
  const { buildHelpMenu } = await import('./helpBuilder.mjs');
  const payload = buildHelpMenu(client);

  try {
    await message.edit(payload);
  } catch (err) {
    // Mensagem pode ter sido apagada
    console.warn('[HelpBuilder] Não foi possível editar mensagem de ajuda:', err?.message);
  }
}
