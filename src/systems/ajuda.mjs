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

// Valida emojis unicode E customizados do Discord (<:name:id> e <a:name:id>)
function safeEmoji(e) {
  if (!e || typeof e !== 'string') return '📦';
  // Emoji customizado animado: <a:name:id>
  if (/^<a:[a-zA-Z0-9_]+:\d+>$/.test(e)) return e;
  // Emoji customizado estático: <:name:id>
  if (/^<:[a-zA-Z0-9_]+:\d+>$/.test(e)) return e;
  // Emoji unicode simples (descarta strings longas ou HTML-like inválidas)
  if (e.length > 10) return '📦';
  return e;
}

function getCategorias(client) {
  if (!client.systems) return [];
  return Array.from(client.systems.values()).map(meta => ({
    id:       meta.id,
    emoji:    safeEmoji(meta.emoji),
    label:    meta.label || meta.id,
    cor:      meta.cor || 0x5865f2,
    comandos: Array.isArray(meta.comandos) ? meta.comandos : [],
  }));
}

/* =========================
   EMBED PRINCIPAL
========================= */

function embedPrincipal(client, page = 0) {
  const cats       = getCategorias(client);
  const totalPages = Math.max(1, Math.ceil(cats.length / ITENS_POR_PAGINA));
  const safePage   = Math.min(Math.max(page, 0), totalPages - 1);
  const start      = safePage * ITENS_POR_PAGINA;
  const items      = cats.slice(start, start + ITENS_POR_PAGINA);

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('✨ FiskBot — Central de Comandos')
    .setDescription(
      '**Criado por Finix Yin**\n\n' +
      (items.length ? items.map(c => `${c.emoji} **${c.label}**`).join('\n') : 'Nenhuma categoria disponível.')
    )
    .setFooter({ text: `Página ${safePage + 1}/${totalPages}` });
}

/* =========================
   CATEGORIA
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
   MENU
========================= */

function menuPrincipal(client, userId, page = 0) {
  const cats       = getCategorias(client);
  const totalPages = Math.max(1, Math.ceil(cats.length / ITENS_POR_PAGINA));
  const safePage   = Math.min(Math.max(page, 0), totalPages - 1);
  const start      = safePage * ITENS_POR_PAGINA;
  const items      = cats.slice(start, start + ITENS_POR_PAGINA);

  // FIX: validar cada opção rigorosamente + garantir pelo menos 1 opção
  let opcoes = items
    .filter(c =>
      c &&
      typeof c.id    === 'string' && c.id.trim().length    >= 1 && c.id.trim().length    <= 100 &&
      typeof c.label === 'string' && c.label.trim().length >= 1 && c.label.trim().length <= 100
    )
    .map(c => ({
      label: String(c.label).trim().slice(0, 100),
      value: String(c.id).trim().slice(0, 100),
    }));

  // FIX: Discord rejeita addOptions([]) — garante mínimo 1 opção
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
   BOTÕES
========================= */

function navegacao(client, userId, page = 0) {
  const cats       = getCategorias(client);
  const totalPages = Math.max(1, Math.ceil(cats.length / ITENS_POR_PAGINA));
  const safePage   = Math.min(Math.max(page, 0), totalPages - 1);

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ajuda_prev:${userId}:${safePage}`)
      .setLabel('⬅')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage <= 0),
    new ButtonBuilder()
      .setCustomId(`ajuda_menu:${userId}:${safePage}`)
      .setLabel('🏠 Menu')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`ajuda_next:${userId}:${safePage}`)
      .setLabel('➡')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage >= totalPages - 1)
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
    const cfg     = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const cmd = msg.content.slice(prefixo.length).trim().split(/\s+/)[0].toLowerCase();
    if (!['ajuda', 'help', 'comandos'].includes(cmd)) return;

    try {
      return msg.reply({
        embeds:     [embedPrincipal(client, 0)],
        components: [menuPrincipal(client, msg.author.id, 0), navegacao(client, msg.author.id, 0)],
      });
    } catch (err) {
      console.error('[ajuda] erro:', err);
      return msg.reply({ embeds: [embedPrincipal(client, 0)] });
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
    if (!interaction.customId.startsWith('ajuda_')) return;

    const [type, userId, pageRaw] = interaction.customId.split(':');
    let page = parseInt(pageRaw ?? '0', 10);
    if (isNaN(page)) page = 0;

    // FIX: flags: 64 em vez de ephemeral: true (deprecated)
    if (interaction.user.id !== userId) {
      return interaction.reply({ content: '❌ Não é seu menu.', flags: 64 });
    }

    const cats       = getCategorias(client);
    const totalPages = Math.max(1, Math.ceil(cats.length / ITENS_POR_PAGINA));
    page = Math.min(Math.max(page, 0), totalPages - 1);

    try {
      if (interaction.isStringSelectMenu()) {
        const id = interaction.values[0];
        if (id === 'sem_categorias') {
          return interaction.update({ embeds: [embedPrincipal(client, page)], components: [menuPrincipal(client, userId, page), navegacao(client, userId, page)] });
        }
        return interaction.update({
          embeds:     [embedCategoria(client, id)],
          components: [navegacao(client, userId, page)],
        });
      }

      // Botões
      let newPage = page;
      if (type === 'ajuda_prev')  newPage = page - 1;
      if (type === 'ajuda_next')  newPage = page + 1;
      if (type === 'ajuda_menu')  newPage = 0;
      newPage = Math.min(Math.max(newPage, 0), totalPages - 1);

      return interaction.update({
        embeds:     [embedPrincipal(client, newPage)],
        components: [menuPrincipal(client, userId, newPage), navegacao(client, userId, newPage)],
      });
    } catch (err) {
      console.error('[ajuda] interaction erro:', err);
      // Interaction pode já ter expirado — não tenta responder de novo
    }
  });
}

export const comandos = [
  { cmd: '!ajuda',    desc: 'Abre o menu de ajuda com todas as categorias.' },
  { cmd: '!help',     desc: 'Alias de !ajuda.' },
  { cmd: '!comandos', desc: 'Alias de !ajuda.' },
];
