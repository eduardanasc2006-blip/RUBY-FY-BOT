import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

const EXPIRACAO_MS = 5 * 60 * 1000;

/**
 * 🔥 Pega sistemas reais do loader
 */
function getCategorias(client) {
  const cats = {};

  if (!client.systems) return cats;

  for (const [id, meta] of client.systems.entries()) {
    cats[id] = {
      id,
      emoji: typeof meta.emoji === 'string' ? meta.emoji : '📦',
      label: meta.label || id,
      cor: meta.cor || 0x5865f2,
      comandos: meta.comandos || []
    };
  }

  return cats;
}

function embedPrincipal(client) {
  const categorias = getCategorias(client);

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('✨ FiskBot — Central de Comandos')
    .setDescription(
      '**Criado por Finix Yin**\n\n' +
      'Selecione uma categoria abaixo para ver os comandos.\n\n' +
      Object.values(categorias)
        .map(c => `${c.emoji} **${c.label}**`)
        .join('\n')
    )
    .setTimestamp();
}

function embedCategoria(client, id) {
  const categorias = getCategorias(client);
  const cat = categorias[id];

  if (!cat) return null;

  const linhas = cat.comandos.length
    ? cat.comandos.map(c => `\`${c.cmd}\`\n┗ ${c.desc}`).join('\n\n')
    : 'Nenhum comando registrado.';

  return new EmbedBuilder()
    .setColor(cat.cor)
    .setTitle(`${cat.emoji} ${cat.label}`)
    .setDescription(linhas)
    .setTimestamp();
}

function menuPrincipal(client, userId) {
  const categorias = getCategorias(client);

  const opcoes = [];

  for (const cat of Object.values(categorias)) {
    try {
      opcoes.push({
        label: String(cat.label).slice(0, 100),
        value: String(cat.id).slice(0, 100), // 🔥 FIX PRINCIPAL
        emoji: typeof cat.emoji === 'string' ? cat.emoji : '📦'
      });
    } catch (e) {
      console.log('[AJUDA] Categoria ignorada:', cat?.label);
    }
  }

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`ajuda_menu:${userId}`)
      .setPlaceholder('📂 Selecione uma categoria...')
      .addOptions(opcoes.slice(0, 25))
  );
}

function botaoVoltar(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ajuda_voltar:${userId}`)
      .setLabel('⬅ Voltar')
      .setStyle(ButtonStyle.Secondary)
  );
}

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

      if (!['ajuda', 'help', 'comandos'].includes(cmd)) return;

      await msg.reply({
        embeds: [embedPrincipal(client)],
        components: [menuPrincipal(client, msg.author.id)]
      });

    } catch (err) {
      console.error('ERRO AJUDA:', err);
    }
  });

  client.on('interactionCreate', async (interaction) => {
    try {
      if (!interaction.isStringSelectMenu() && !interaction.isButton()) return;

      const userId = interaction.customId.split(':')[1];

      if (interaction.user.id !== userId)
        return interaction.reply({
          content: '❌ Não é seu menu.',
          ephemeral: true
        });

      // SELECT MENU
      if (interaction.isStringSelectMenu()) {
        const id = interaction.values[0];

        const embed = embedCategoria(client, id);

        if (!embed)
          return interaction.reply({
            content: '❌ Categoria inválida.',
            ephemeral: true
          });

        return interaction.update({
          embeds: [embed],
          components: [botaoVoltar(userId)],
        });
      }

      // BOTÃO VOLTAR
      if (interaction.isButton()) {
        return interaction.update({
          embeds: [embedPrincipal(client)],
          components: [menuPrincipal(client, userId)],
        });
      }

    } catch (e) {
      console.error(e);

      if (!interaction.replied) {
        interaction.reply({
          content: '❌ Erro ao carregar ajuda.',
          ephemeral: true,
        }).catch(() => {});
      }
    }
  });
}
