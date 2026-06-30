import { EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { fundos, molduras, efeitos, badges } from './perfilConfig.mjs';
import Usuario from '../db/models/Usuario.mjs';

const CATEGORIAS = { fundos, molduras, efeitos, badges };
const CAT_NOMES  = { fundos: 'Fundos', molduras: 'Molduras', efeitos: 'Efeitos', badges: 'Badges' };
const PAGE_SIZE  = 5;

function rarityColor(r) {
  return { Comum: 0x9e9e9e, Incomum: 0x4caf50, Raro: 0x2196f3, Épico: 0x9c27b0, Lendário: 0xff9800 }[r] ?? 0xffffff;
}

function buildLojaEmbed(cat, page, user) {
  const items = Object.entries(CATEGORIAS[cat] ?? {});
  const total = Math.ceil(items.length / PAGE_SIZE);
  const slice = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const inv   = user?.inventario ?? {};
  const owned = inv[cat] ?? [];

  const embed = new EmbedBuilder()
    .setColor(Colors.Blurple)
    .setTitle(`🏪 Loja — ${CAT_NOMES[cat]}`)
    .setFooter({ text: `Página ${page + 1}/${total} • Use !comprar <id> para comprar` });

  slice.forEach(([id, item]) => {
    const comprado = owned.includes(id);
    const preco    = item.preco ?? 0;
    const tag      = comprado ? '✅ Comprado' : `💰 ${preco.toLocaleString()} XP`;
    const extra    = item.cores ? `\`${item.cores.join(' → ')}\`` : '';
    embed.addFields({
      name: `**${item.nome}** \`${id}\` — ${item.raridade}`,
      value: `${item.descricao ?? extra ?? '—'}\n${tag}`,
    });
  });

  return { embed, total };
}

export async function loja(message, args) {
  const cat   = (args[0] ?? 'fundos').toLowerCase();
  const page  = Math.max(0, (parseInt(args[1]) || 1) - 1);
  const userId = message.author.id, guildId = message.guild?.id;

  if (!CATEGORIAS[cat]) {
    return message.reply(`❌ Categoria inválida. Use: \`fundos\`, \`molduras\`, \`efeitos\`, \`badges\``);
  }

  const user = userId && guildId
    ? await Usuario.findOne({ userId, guildId })
    : null;

  const { embed, total } = buildLojaEmbed(cat, page, user);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`loja_${cat}_${page - 1}`).setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
    new ButtonBuilder().setCustomId(`loja_${cat}_${page + 1}`).setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(page >= total - 1),
  );

  return message.reply({ embeds: [embed], components: [row] });
}

export async function comprar(message, args) {
  const itemId = args[0]?.toLowerCase();
  if (!itemId) return message.reply('❌ Informe o ID do item. Ex: `!comprar neon_roxo`');

  let cat = null, item = null;
  for (const [c, items] of Object.entries(CATEGORIAS)) {
    if (items[itemId]) { cat = c; item = items[itemId]; break; }
  }
  if (!cat) return message.reply(`❌ Item \`${itemId}\` não encontrado. Veja \`!loja\` para os itens disponíveis.`);

  const userId = message.author.id, guildId = message.guild?.id;
  if (!guildId) return message.reply('❌ Comando apenas em servidores.');

  let user = await Usuario.findOne({ userId, guildId });
  if (!user) return message.reply('❌ Você ainda não tem perfil. Mande uma mensagem para ganhar XP primeiro.');

  const inv   = user.inventario ?? {};
  const owned = inv[cat] ?? [];
  if (owned.includes(itemId)) return message.reply(`✅ Você já possui **${item.nome}**.`);

  const preco = item.preco ?? 0;
  if ((user.xpTotal ?? 0) < preco)
    return message.reply(`❌ XP insuficiente. Você tem **${(user.xpTotal ?? 0).toLocaleString()} XP** e precisa de **${preco.toLocaleString()} XP**.`);

  const newInv = { ...inv, [cat]: [...owned, itemId] };
  await Usuario.updateOne({ userId, guildId }, {
    $inc:  { xpTotal: -preco },
    $set:  { inventario: newInv },
  });

  return message.reply({
    embeds: [new EmbedBuilder()
      .setColor(rarityColor(item.raridade))
      .setTitle(`✅ Compra realizada!`)
      .setDescription(`Você comprou **${item.nome}** (${item.raridade}) por **${preco.toLocaleString()} XP**.\nUse \`!equipar${cat.slice(0, -1)} ${itemId}\` para equipar.`)
    ]
  });
}

export function register(client, configs) {
  if (client.__lojaRegistrado) return;
  client.__lojaRegistrado = true;

  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo ?? '!';
    if (!msg.content.startsWith(prefixo)) return;
    const parts = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    try {
      if (cmd === 'loja')   await loja(msg, args);
      if (cmd === 'comprar') await comprar(msg, args);
    } catch (e) { console.error('[loja]', e); }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    const [prefix, cat, pageStr] = interaction.customId.split('_');
    if (prefix !== 'loja') return;
    const page = parseInt(pageStr);
    if (isNaN(page) || page < 0) return;
    const user = await Usuario.findOne({ userId: interaction.user.id, guildId: interaction.guildId }).catch(() => null);
    const { embed, total } = buildLojaEmbed(cat, page, user);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`loja_${cat}_${page - 1}`).setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
      new ButtonBuilder().setCustomId(`loja_${cat}_${page + 1}`).setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(page >= total - 1),
    );
    await interaction.update({ embeds: [embed], components: [row] }).catch(() => null);
  });
}
