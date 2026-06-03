import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

const EXPIRACAO_MS = 5 * 60 * 1000;

/**
 * 🔥 HELP DINÂMICO BASEADO NOS SISTEMAS DO LOADER
 */
function getCategorias(client) {
  const cats = {};

  if (!client.systems) return cats;

  for (const meta of client.systems.values()) {
    if (!meta) continue;

    const categoria = meta.label || 'Outros';

    if (!cats[categoria]) {
      cats[categoria] = {
        emoji: meta.emoji || '📦',
        label: categoria,
        cor: meta.cor || 0x5865f2,
        comandos: []
      };
    }

    if (Array.isArray(meta.comandos)) {
      cats[categoria].comandos.push(...meta.comandos);
    }
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
    .setFooter({ text: 'FiskBot • Selecione uma categoria no menu abaixo' })
    .setTimestamp();
}

function embedCategoria(client, id) {
  const categorias = getCategorias(client);

  const cat = Object.values(categorias).find(c => c.label === id);
  if (!cat) return null;

  const linhas = cat.comandos
    .map(c => `\`${c.cmd}\`\n┗ ${c.desc}`)
    .join('\n\n');

  return new EmbedBuilder()
    .setColor(cat.cor || 0x5865f2)
    .setTitle(`${cat.emoji} ${cat.label}`)
    .setDescription(linhas || 'Nenhum comando disponível.')
    .setFooter({ text: 'FiskBot • Clique em ⬅ Voltar para o menu principal' })
    .setTimestamp();
}

function menuPrincipal(client, userId) {
  const categorias = getCategorias(client);

  const opcoes = Object.entries(categorias).map(([id, cat]) =>
    new StringSelectMenuOptionBuilder()
      .setValue(id)
      .setLabel(cat.label)
      .setEmoji(cat.emoji)
  );

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`ajuda_menu:${userId}`)
      .setPlaceholder('📂 Selecione uma categoria...')
      .addOptions(opcoes)
  );
}

function botaoVoltar(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ajuda_voltar:${userId}`)
      .setLabel('⬅ Voltar ao Menu Principal')
      .setStyle(ButtonStyle.Secondary)
  );
}

export function register(client, configs) {
  const sessoes = new Map();

  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    if (cmd !== 'ajuda' && cmd !== 'help' && cmd !== 'comandos') return;

    try {
      const sent = await msg.reply({
        embeds: [embedPrincipal(client)],
        components: [menuPrincipal(client, msg.author.id)],
      });

      sessoes.set(sent.id, {
        userId: msg.author.id,
        timer: setTimeout(() => {
          sent.edit({ components: [] }).catch(() => {});
          sessoes.delete(sent.id);
        }, EXPIRACAO_MS),
      });

    } catch (e) {
      await msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('✨ FiskBot — Comandos')
            .setDescription('❌ Erro ao carregar menu interativo.')
            .setTimestamp()
        ],
      }).catch(() => {});
    }
  });

  client.on('interactionCreate', async (interaction) => {
    try {
      if (!interaction.isStringSelectMenu() && !interaction.isButton()) return;

      const { customId } = interaction;

      // 📂 selecionar categoria
      if (interaction.isStringSelectMenu() && customId.startsWith('ajuda_menu:')) {
        const userId = customId.split(':')[1];

        if (interaction.user.id !== userId)
          return interaction.reply({ content: '❌ Este menu não é seu.', ephemeral: true });

        const catId = interaction.values[0];

        const embed = embedCategoria(client, catId);
        if (!embed)
          return interaction.reply({ content: '❌ Categoria inválida.', ephemeral: true });

        await interaction.update({
          embeds: [embed],
          components: [botaoVoltar(userId)],
        });
      }

      // ⬅ voltar
      if (interaction.isButton() && customId.startsWith('ajuda_voltar:')) {
        const userId = customId.split(':')[1];

        if (interaction.user.id !== userId)
          return interaction.reply({ content: '❌ Este menu não é seu.', ephemeral: true });

        await interaction.update({
          embeds: [embedPrincipal(client)],
          components: [menuPrincipal(client, userId)],
        });
      }

    } catch (e) {
      interaction.reply({
        content: '❌ Erro ao processar interação.',
        ephemeral: true,
      }).catch(() => {});
    }
  });
}
