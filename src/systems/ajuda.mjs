import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

export const comandos = [
  {
    cmd: '!ajuda',
    desc: 'Abre o painel de ajuda do bot',
  },
];

const ITENS_POR_PAGINA = 25;

/* ========================================= */

function safeEmoji(e) {
  if (!e || typeof e !== 'string') return '📦';

  if (/^\p{Extended_Pictographic}$/u.test(e)) return e;

  if (e.startsWith('<:') && e.endsWith('>')) return e;

  return '📦';
}

function getCategorias(client) {
  const cats = {};

  if (!client.systems) return cats;

  for (const [id, meta] of client.systems.entries()) {
    cats[id] = {
      id,
      emoji: safeEmoji(meta.emoji),
      label: meta.label || id,
      cor: meta.cor || 0x5865f2,
      comandos: meta.comandos || [],
    };
  }

  return cats;
}

/* ========================================= */

function embedPrincipal(client, pagina = 0) {
  const categorias = Object.values(getCategorias(client));

  const totalPaginas =
    Math.ceil(categorias.length / ITENS_POR_PAGINA) || 1;

  const inicio = pagina * ITENS_POR_PAGINA;
  const fim = inicio + ITENS_POR_PAGINA;

  const visiveis = categorias.slice(inicio, fim);

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('✨ FiskBot — Central de Comandos')
    .setDescription(
      '**Criado por Finix Yin**\n\n' +
      'Selecione uma categoria abaixo para ver os comandos.\n\n' +
      visiveis
        .map(c => `${c.emoji} **${c.label}**`)
        .join('\n')
    )
    .setFooter({
      text: `Página ${pagina + 1}/${totalPaginas}`,
    })
    .setTimestamp();
}

/* ========================================= */

function embedCategoria(client, id) {
  const categorias = getCategorias(client);

  const cat = categorias[id];

  if (!cat) return null;

  const linhas = cat.comandos.length
    ? cat.comandos
        .map(c => `\`${c.cmd}\`\n┗ ${c.desc}`)
        .join('\n\n')
    : 'Nenhum comando registrado.';

  return new EmbedBuilder()
    .setColor(cat.cor)
    .setTitle(`${cat.emoji} ${cat.label}`)
    .setDescription(linhas)
    .setTimestamp();
}

/* ========================================= */

function menuPrincipal(client, userId, pagina = 0) {
  const categorias = Object.values(getCategorias(client));

  const inicio = pagina * ITENS_POR_PAGINA;
  const fim = inicio + ITENS_POR_PAGINA;

  const visiveis = categorias.slice(inicio, fim);

  const opcoes = visiveis.map(cat => ({
    label: String(cat.label).slice(0, 100),
    value: String(cat.id).slice(0, 100),
    emoji: safeEmoji(cat.emoji),
  }));

  if (!opcoes.length) {
    opcoes.push({
      label: 'Nenhuma categoria',
      value: 'vazio',
      emoji: '📦',
    });
  }

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`ajuda_menu:${userId}:${pagina}`)
      .setPlaceholder('📂 Selecione uma categoria...')
      .addOptions(opcoes)
  );
}

/* ========================================= */

function navegacao(client, userId, pagina = 0) {
  const totalCategorias =
    Object.keys(getCategorias(client)).length;

  const totalPaginas =
    Math.ceil(totalCategorias / ITENS_POR_PAGINA) || 1;

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ajuda_prev:${userId}:${pagina}`)
      .setLabel('⬅ Anterior')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(pagina <= 0),

    new ButtonBuilder()
      .setCustomId(`ajuda_next:${userId}:${pagina}`)
      .setLabel('➡ Próxima')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(pagina >= totalPaginas - 1)
  );
}

/* ========================================= */

function botaoVoltar(userId, pagina = 0) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ajuda_voltar:${userId}:${pagina}`)
      .setLabel('⬅ Voltar')
      .setStyle(ButtonStyle.Secondary)
  );
}

/* ========================================= */

export function register(client, configs) {
  console.log('[AJUDA] Sistema carregado');

  client.on('messageCreate', async (msg) => {
    try {
      if (msg.author.bot || !msg.guild) return;

      const cfg = configs.get(msg.guild.id);
      const prefixo = cfg?.prefixo || '!';

      if (!msg.content.startsWith(prefixo)) return;

      const cmd = msg.content
        .slice(prefixo.length)
        .trim()
        .split(/\s+/)[0]
        .toLowerCase();

      if (!['ajuda', 'help', 'comandos'].includes(cmd))
        return;

      await msg.reply({
        embeds: [embedPrincipal(client, 0)],
        components: [
          menuPrincipal(client, msg.author.id, 0),
          navegacao(client, msg.author.id, 0),
        ],
      });
    } catch (err) {
      console.error('ERRO AJUDA:', err);
    }
  });

  client.on('interactionCreate', async (interaction) => {
    try {
      if (
        !interaction.isStringSelectMenu() &&
        !interaction.isButton()
      )
        return;

      const partes = interaction.customId.split(':');

      const userId = partes[1];

      if (interaction.user.id !== userId) {
        return interaction.reply({
          content: '❌ Não é seu menu.',
          ephemeral: true,
        });
      }

      if (interaction.isStringSelectMenu()) {
        const categoria = interaction.values[0];

        if (categoria === 'vazio')
          return interaction.deferUpdate();

        const embed = embedCategoria(client, categoria);

        return interaction.update({
          embeds: [embed],
          components: [
            botaoVoltar(userId, Number(partes[2]) || 0),
          ],
        });
      }

      if (interaction.customId.startsWith('ajuda_prev')) {
        let pagina = Number(partes[2]) || 0;

        pagina--;

        return interaction.update({
          embeds: [embedPrincipal(client, pagina)],
          components: [
            menuPrincipal(client, userId, pagina),
            navegacao(client, userId, pagina),
          ],
        });
      }

      if (interaction.customId.startsWith('ajuda_next')) {
        let pagina = Number(partes[2]) || 0;

        pagina++;

        return interaction.update({
          embeds: [embedPrincipal(client, pagina)],
          components: [
            menuPrincipal(client, userId, pagina),
            navegacao(client, userId, pagina),
          ],
        });
      }

      if (interaction.customId.startsWith('ajuda_voltar')) {
        const pagina = Number(partes[2]) || 0;

        return interaction.update({
          embeds: [embedPrincipal(client, pagina)],
          components: [
            menuPrincipal(client, userId, pagina),
            navegacao(client, userId, pagina),
          ],
        });
      }
    } catch (err) {
      console.error(err);

      if (!interaction.replied) {
        interaction
          .reply({
            content: '❌ Erro ao carregar ajuda.',
            ephemeral: true,
          })
          .catch(() => {});
      }
    }
  });
        }
