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
 * 🔥 Pega sistemas reais do loader
 */
function getCategorias(client) {
  const cats = {};

  if (!client.systems) return cats;

  for (const [nome, meta] of client.systems.entries()) {
    const label = meta.label || nome;

    if (!cats[label]) {
      cats[label] = {
        emoji: meta.emoji || '📦',
        label,
        cor: meta.cor || 0x5865f2,
        comandos: meta.comandos || []
      };
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
    .setTimestamp();
}

function embedCategoria(client, label) {
  const categorias = getCategorias(client);
  const cat = categorias[label];

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
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`ajuda_menu:${userId}`)
      .setPlaceholder('Selecione')
      .addOptions({
        label: 'XP & Niveis',
        value: 'XP & Niveis',
        emoji: '⭐'
      })
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

  const sessoes = new Map();

client.on('messageCreate', async (msg) => {
  console.log('MENSAGEM RECEBIDA PELO AJUDA');

  try {
    if (msg.author.bot || !msg.guild) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';

    console.log('PREFIXO:', prefixo);
    console.log('MSG:', msg.content);

    if (!msg.content.startsWith(prefixo)) return;

    const cmd = msg.content
      .slice(prefixo.length)
      .trim()
      .split(/\s+/)[0]
      .toLowerCase();

    console.log('CMD:', cmd);

    if (!['ajuda', 'help', 'comandos'].includes(cmd))
      return;

    console.log('COMANDO AJUDA DETECTADO');

    const categorias = getCategorias(client);

console.log(
  'CATEGORIAS:',
  JSON.stringify(Object.keys(categorias))
);

console.log(
  'TOTAL CATEGORIAS:',
  Object.keys(categorias).length
);

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
        return interaction.reply({ content: '❌ Não é seu menu.', ephemeral: true });

      // SELECT MENU
      if (interaction.isStringSelectMenu()) {
        const label = interaction.values[0];

        const embed = embedCategoria(client, label);

        if (!embed)
          return interaction.reply({ content: '❌ Categoria inválida.', ephemeral: true });

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
      interaction.reply({
        content: '❌ Erro ao carregar ajuda.',
        ephemeral: true,
      }).catch(() => {});
    }
  });
  }
