import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

const ITENS_POR_PAGINA = 8;

/* =========================
   UTIL
========================= */

function safeEmoji(e) {
  if (!e || typeof e !== 'string') return '📦';
  if (e.startsWith('<:') && e.endsWith('>')) return e;
  return e;
}

function getCategorias(client) {
  if (!client.systems) return [];

  return Array.from(client.systems.values()).map(meta => ({
    id: meta.id,
    emoji: safeEmoji(meta.emoji),
    label: meta.label || meta.id,
    cor: meta.cor || 0x5865f2,
    comandos: Array.isArray(meta.comandos) ? meta.comandos : [],
  }));
}

/* =========================
   EMBED PRINCIPAL
========================= */

function embedPrincipal(client, page = 0) {
  const cats = getCategorias(client);

  const totalPages = Math.ceil(cats.length / ITENS_POR_PAGINA) || 1;

  const start = page * ITENS_POR_PAGINA;
  const items = cats.slice(start, start + ITENS_POR_PAGINA);

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('✨ FiskBot — Central de Comandos')
    .setDescription(
      '**Criado por Finix Yin**\n\n' +
      'Use o menu ou navegue pelas categorias:\n\n' +
      items.map(c => `${c.emoji} **${c.label}**`).join('\n')
    )
    .setFooter({ text: `Página ${page + 1}/${totalPages}` });
}

/* =========================
   CATEGORIA
========================= */

function embedCategoria(client, id) {
  const cat = getCategorias(client).find(c => c.id === id);

  if (!cat) {
    return new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('❌ Categoria não encontrada')
      .setDescription('Essa categoria não existe mais.');
  }

  const cmds = cat.comandos.length
    ? cat.comandos.map(c => `\`${c.cmd}\`\n┗ ${c.desc}`).join('\n\n')
    : 'Nenhum comando registrado.';

  return new EmbedBuilder()
    .setColor(cat.cor)
    .setTitle(`${cat.emoji} ${cat.label}`)
    .setDescription(cmds);
}

/* =========================
   MENU
========================= */

function menuPrincipal(client, userId, page = 0) {
  const cats = getCategorias(client);

  const start = page * ITENS_POR_PAGINA;
  const items = cats.slice(start, start + ITENS_POR_PAGINA);

  const options = items.map(c => ({
    label: c.label.slice(0, 100),
    value: c.id,
    emoji: c.emoji,
  }));

  if (!options.length) {
    options.push({
      label: 'Nenhuma categoria',
      value: 'vazio',
      emoji: '📦',
    });
  }

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`ajuda_menu:${userId}:${page}`)
      .setPlaceholder('📂 Selecione uma categoria')
      .addOptions(options)
  );
}

/* =========================
   NAVEGAÇÃO GLOBAL (← →)
========================= */

function navegacao(client, userId, page = 0) {
  const total = getCategorias(client).length;
  const totalPages = Math.ceil(total / ITENS_POR_PAGINA) || 1;

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ajuda_prev:${userId}:${page}`)
      .setLabel('⬅')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),

    new ButtonBuilder()
      .setCustomId(`ajuda_next:${userId}:${page}`)
      .setLabel('➡')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1)
  );
}

/* =========================
   VOLTAR
========================= */

function botaoVoltar(userId, page = 0) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ajuda_back:${userId}:${page}`)
      .setLabel('⬅ Voltar')
      .setStyle(ButtonStyle.Secondary)
  );
}

/* =========================
   REGISTER
========================= */

export function register(client, configs) {
  console.log('[AJUDA] Sistema carregado');

  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';

    if (!msg.content.startsWith(prefixo)) return;

    const cmd = msg.content
      .slice(prefixo.length)
      .trim()
      .split(/\s+/)[0]
      .toLowerCase();

    if (!['ajuda', 'help', 'comandos'].includes(cmd)) return;

    return msg.reply({
      embeds: [embedPrincipal(client, 0)],
      components: [
        menuPrincipal(client, msg.author.id, 0),
        navegacao(client, msg.author.id, 0),
      ],
    });
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu())
      return;

    const parts = interaction.customId.split(':');
    const userId = parts[1];
    const page = Number(parts[2]) || 0;

    if (interaction.user.id !== userId) {
      return interaction.reply({
        content: '❌ Não é seu menu.',
        ephemeral: true,
      });
    }

    /* =========================
       SELECT CATEGORIA
    ========================= */

    if (interaction.isStringSelectMenu()) {
      const id = interaction.values[0];

      if (id === 'vazio') return interaction.deferUpdate();

      return interaction.update({
        embeds: [embedCategoria(client, id)],
        components: [botaoVoltar(userId, page)],
      });
    }

    /* =========================
       ← ANTERIOR
    ========================= */

    if (interaction.customId.startsWith('ajuda_prev')) {
      const newPage = Math.max(0, page - 1);

      return interaction.update({
        embeds: [embedPrincipal(client, newPage)],
        components: [
          menuPrincipal(client, userId, newPage),
          navegacao(client, userId, newPage),
        ],
      });
    }

    /* =========================
       → PRÓXIMO
    ========================= */

    if (interaction.customId.startsWith('ajuda_next')) {
      const newPage = page + 1;

      return interaction.update({
        embeds: [embedPrincipal(client, newPage)],
        components: [
          menuPrincipal(client, userId, newPage),
          navegacao(client, userId, newPage),
        ],
      });
    }

    /* =========================
       VOLTAR CATEGORIA
    ========================= */

    if (interaction.customId.startsWith('ajuda_back')) {
      return interaction.update({
        embeds: [embedPrincipal(client, page)],
        components: [
          menuPrincipal(client, userId, page),
          navegacao(client, userId, page),
        ],
      });
    }
  });
}
