import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

const ITENS_POR_PAGINA = 10;

/* =========================
   UTIL
========================= */

function safeEmoji(e) {
  if (!e || typeof e !== 'string') return '📦';
  if (/^<a:[a-zA-Z0-9_]+:\d+>$/.test(e)) return e;
  if (/^<:[a-zA-Z0-9_]+:\d+>$/.test(e)) return e;
  if (e.length > 10) return '📦';
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
   EMBEDS
========================= */

function embedMenu(client) {
  const cats = getCategorias(client);

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('✨ FiskBot — Categorias')
    .setDescription(
      cats.length
        ? cats.map(c => `${c.emoji} **${c.label}**`).join('\n')
        : 'Nenhuma categoria disponível.'
    )
    .setFooter({ text: 'Use ⬅ ➡ ou selecione uma categoria' });
}

function embedCategoria(client, index) {
  const cats = getCategorias(client);
  const cat = cats[index];

  if (!cat) {
    return new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('❌ Categoria não encontrada');
  }

  const cmds = cat.comandos.length
    ? cat.comandos.map(c => `\`${c.cmd}\` — ${c.desc}`).join('\n')
    : 'Nenhum comando registrado.';

  return new EmbedBuilder()
    .setColor(cat.cor)
    .setTitle(`${cat.emoji} ${cat.label}`)
    .setDescription(cmds)
    .setFooter({ text: `Categoria ${index + 1}/${cats.length}` });
}

/* =========================
   MENU SELECT
========================= */

function menuPrincipal(client, userId) {
  const cats = getCategorias(client);

  let opcoes = cats
    .filter(c => c.id && c.label)
    .map(c => ({
      label: String(c.label).slice(0, 100),
      value: String(c.id).slice(0, 100),
    }));

  if (!opcoes.length) {
    opcoes = [{ label: 'Sem categorias', value: 'sem_categorias' }];
  }

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`ajuda_menu:${userId}`)
      .setPlaceholder('📂 Selecione uma categoria')
      .addOptions(opcoes)
  );
}

/* =========================
   BOTÕES (HÍBRIDO)
========================= */

function navegacao(client, userId, mode, index) {
  const cats = getCategorias(client);
  const max = cats.length - 1;

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ajuda_prev:${userId}:${mode}:${index}`)
      .setLabel('⬅')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(index <= 0),

    new ButtonBuilder()
      .setCustomId(`ajuda_menu:${userId}:menu:0`)
      .setLabel('🏠 Menu')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId(`ajuda_next:${userId}:${mode}:${index}`)
      .setLabel('➡')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(index >= max)
  );
}

/* =========================
   REGISTER
========================= */

export function register(client, configs) {
  if (client.__ajudaRegistrado) return;
  client.__ajudaRegistrado = true;

  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';

    if (!msg.content.startsWith(prefixo)) return;

    const cmd = msg.content.slice(prefixo.length).trim().split(/\s+/)[0].toLowerCase();

    if (!['ajuda', 'help', 'comandos'].includes(cmd)) return;

    return msg.reply({
      embeds: [embedMenu(client)],
      components: [
        menuPrincipal(client, msg.author.id),
        navegacao(client, msg.author.id, 'menu', 0),
      ],
    });
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
    if (!interaction.customId.startsWith('ajuda_')) return;

    const [type, userId, mode, indexRaw] = interaction.customId.split(':');

    if (interaction.user.id !== userId) {
      return interaction.reply({ content: '❌ Não é seu menu.', flags: 64 });
    }

    const cats = getCategorias(client);
    const max = cats.length - 1;

    let index = parseInt(indexRaw ?? '0', 10);
    if (isNaN(index)) index = 0;

    let newIndex = index;

    if (type === 'ajuda_prev') newIndex--;
    if (type === 'ajuda_next') newIndex++;
    if (type === 'ajuda_menu') newIndex = 0;

    newIndex = Math.min(Math.max(newIndex, 0), max);

    try {
      // SELECT MENU
      if (interaction.isStringSelectMenu()) {
        const id = interaction.values[0];
        const idx = cats.findIndex(c => c.id === id);

        if (id === 'sem_categorias') {
          return interaction.update({
            embeds: [embedMenu(client)],
            components: [
              menuPrincipal(client, userId),
              navegacao(client, userId, 'menu', 0),
            ],
          });
        }

        return interaction.update({
          embeds: [embedCategoria(client, idx)],
          components: [
            navegacao(client, userId, 'cat', idx),
          ],
        });
      }

      // BOTÕES
      if (mode === 'menu') {
        return interaction.update({
          embeds: [embedMenu(client)],
          components: [
            menuPrincipal(client, userId),
            navegacao(client, userId, 'menu', newIndex),
          ],
        });
      }

      return interaction.update({
        embeds: [embedCategoria(client, newIndex)],
        components: [
          navegacao(client, userId, 'cat', newIndex),
        ],
      });

    } catch (err) {
      console.error('[ajuda] erro:', err);
    }
  });
}

/* =========================
   COMANDOS
========================= */

export const comandos = [
  { cmd: '!ajuda', desc: 'Abre o menu de ajuda com categorias.' },
  { cmd: '!help', desc: 'Alias de !ajuda.' },
  { cmd: '!comandos', desc: 'Alias de !ajuda.' },
];
