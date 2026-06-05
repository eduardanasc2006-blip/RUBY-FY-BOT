import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

/* =========================
   CONFIG
========================= */

const ITENS_POR_PAGINA = 10;

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
      items.map(c => `${c.emoji} **${c.label}**`).join('\n')
    )
    .setFooter({ text: `Página ${page + 1}/${totalPages}` });
}

/* =========================
   EMBED CATEGORIA
========================= */

function embedCategoria(client, id) {
  const cat = getCategorias(client).find(c => c.id === id);

  if (!cat) {
    return new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('❌ Categoria não encontrada');
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
   MENU SELECT
========================= */

function menuPrincipal(client, userId, page = 0) {
  const cats = getCategorias(client);

  const start = page * ITENS_POR_PAGINA;
  const items = cats.slice(start, start + ITENS_POR_PAGINA);

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`ajuda_menu:${userId}`)
      .setPlaceholder('📂 Selecione uma categoria')
      .addOptions(
        items.map(c => ({
          label: c.label.slice(0, 100),
          value: c.id,
          emoji: c.emoji,
        }))
      )
  );
}

/* =========================
   BOTÕES DE NAVEGAÇÃO
========================= */

function navegacao(client, userId, page = 0) {
  const cats = getCategorias(client);
  const totalPages = Math.ceil(cats.length / ITENS_POR_PAGINA) || 1;

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
   REGISTER
========================= */

export function register(client, configs) {
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
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

    const [type, userId, pageRaw] = interaction.customId.split(':');
    const page = parseInt(pageRaw ?? '0', 10);

    if (interaction.user.id !== userId) {
      return interaction.reply({
        content: '❌ Não é seu menu.',
        ephemeral: true,
      });
    }

    const cats = getCategorias(client);
    const totalPages = Math.ceil(cats.length / ITENS_POR_PAGINA) || 1;

    /* =========================
       SELECT MENU
    ========================= */
    if (interaction.isStringSelectMenu()) {
      const id = interaction.values[0];

      return interaction.update({
        embeds: [embedCategoria(client, id)],
        components: [],
      });
    }

    /* =========================
       PAGINAÇÃO
    ========================= */

    let newPage = page;

    if (type === 'ajuda_prev') {
      newPage = Math.max(0, page - 1);
    }

    if (type === 'ajuda_next') {
      newPage = Math.min(totalPages - 1, page + 1);
    }

    return interaction.update({
      embeds: [embedPrincipal(client, newPage)],
      components: [
        menuPrincipal(client, userId, newPage),
        navegacao(client, userId, newPage),
      ],
    });
  });
    }
