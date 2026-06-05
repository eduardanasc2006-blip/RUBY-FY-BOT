import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Usuario from '../db/models/Usuario.mjs';
import { gastarXP } from './xpSystem.mjs';
import { embedErro, embedSucesso } from '../utils/embeds.mjs';

// ════════════════════════════════════════════════════════
//  LOJA — compra de itens com XP disponível
// ════════════════════════════════════════════════════════

const ITENS = [
  // Molduras
  { id: 'moldura_ouro',    nome: '🖼️ Moldura Dourada',       tipo: 'moldura',   preco: 500,  desc: 'Moldura dourada para o perfil.' },
  { id: 'moldura_neon',    nome: '🔮 Moldura Neon',           tipo: 'moldura',   preco: 800,  desc: 'Moldura com efeito neon colorido.' },
  { id: 'moldura_foguete', nome: '🚀 Moldura Galáxia',        tipo: 'moldura',   preco: 1200, desc: 'Moldura espacial premium.' },
  // Badges
  { id: 'badge_estrela',   nome: '⭐ Badge Estrela',           tipo: 'badge',     preco: 300,  desc: 'Badge de estrela para o perfil.' },
  { id: 'badge_fogo',      nome: '🔥 Badge Chama',             tipo: 'badge',     preco: 400,  desc: 'Badge de chama ardente.' },
  { id: 'badge_coroa',     nome: '👑 Badge Realeza',           tipo: 'badge',     preco: 700,  desc: 'Badge exclusivo de realeza.' },
  { id: 'badge_diamante',  nome: '💎 Badge Diamante',          tipo: 'badge',     preco: 1000, desc: 'Badge raro de diamante.' },
  // Efeitos
  { id: 'efeito_confete',  nome: '🎊 Efeito Confete',         tipo: 'efeito',    preco: 600,  desc: 'Confetes no perfil.' },
  { id: 'efeito_aurora',   nome: '🌌 Efeito Aurora',          tipo: 'efeito',    preco: 900,  desc: 'Aurora boreal no perfil.' },
  // Consumíveis
  { id: 'xp_boost_mini',   nome: '⚡ XP Boost Miniatura',     tipo: 'consumivel',preco: 200,  desc: '+50 XP instantâneos.' },
  { id: 'xp_boost_max',    nome: '🚀 XP Boost Máximo',        tipo: 'consumivel',preco: 500,  desc: '+150 XP instantâneos.' },
];

const TIPO_COR = { moldura: 0xf1c40f, badge: 0x3498db, efeito: 0x9b59b6, consumivel: 0x2ecc71 };
const TIPO_EMOJI = { moldura: '🖼️', badge: '🏅', efeito: '✨', consumivel: '⚡' };

function embedLoja(page = 0) {
  const porPagina = 5;
  const inicio    = page * porPagina;
  const itens     = ITENS.slice(inicio, inicio + porPagina);
  const totalPag  = Math.ceil(ITENS.length / porPagina);

  const linhas = itens.map(i =>
    `${TIPO_EMOJI[i.tipo] || '🛒'} **${i.nome}** — \`${i.preco} XP\`\n┗ ${i.desc}\nID: \`${i.id}\``
  );

  return new EmbedBuilder()
    .setColor(0x00a2ff)
    .setTitle('🛍️ Loja FiskBot')
    .setDescription(
      `Use \`!comprar <id>\` para comprar um item.\n\n` +
      linhas.join('\n\n')
    )
    .setFooter({ text: `Página ${page + 1}/${totalPag} • Use !inventario para ver seus itens` })
    .setTimestamp();
}

export const comandos = [
  { cmd: '!loja [página]',  desc: 'Abrir a loja de itens com XP.' },
  { cmd: '!comprar <id>',   desc: 'Comprar um item da loja.' },
  { cmd: '!inventario',     desc: 'Ver itens que você possui.' },
];

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    const cfg     = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd  = args.shift().toLowerCase();
    const guildId = msg.guild.id;

    /* ===== !loja ===== */
    if (cmd === 'loja') {
      const page = Math.max(0, (parseInt(args[0]) || 1) - 1);
      const totalPag = Math.ceil(ITENS.length / 5);
      const p = Math.min(page, totalPag - 1);

      const u = await Usuario.findOne({ userId: msg.author.id, guildId });
      const saldo = u?.xpDisponivel || 0;

      const embed = embedLoja(p).addFields({ name: '💰 Seu saldo', value: `**${saldo.toLocaleString('pt-BR')} XP**`, inline: true });

      const botoes = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`loja_prev:${msg.author.id}:${p}`)
          .setLabel('◀ Anterior')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(p === 0),
        new ButtonBuilder()
          .setCustomId(`loja_next:${msg.author.id}:${p}`)
          .setLabel('Próxima ▶')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(p >= totalPag - 1),
      );

      return msg.reply({ embeds: [embed], components: [botoes] });
    }

    /* ===== !comprar ===== */
    if (cmd === 'comprar') {
      const id   = args[0]?.toLowerCase();
      if (!id) return msg.reply({ embeds: [embedErro('Use: `!comprar <id>` — veja os IDs com `!loja`')] });

      const item = ITENS.find(i => i.id === id);
      if (!item) return msg.reply({ embeds: [embedErro(`Item \`${id}\` não encontrado. Use \`!loja\` para ver os IDs.`)] });

      // Verifica se já possui (exceto consumíveis)
      if (item.tipo !== 'consumivel') {
        const u = await Usuario.findOne({ userId: msg.author.id, guildId });
        const inv = u?.inventario || {};
        const badges   = inv.badges   || [];
        const efeitos  = inv.efeitos  || [];
        if (item.tipo === 'badge'  && badges.includes(item.id))
          return msg.reply({ embeds: [embedErro('Você já possui este badge!')] });
        if (item.tipo === 'efeito' && efeitos.includes(item.id))
          return msg.reply({ embeds: [embedErro('Você já possui este efeito!')] });
        if (item.tipo === 'moldura' && inv.moldura === item.id)
          return msg.reply({ embeds: [embedErro('Você já possui esta moldura!')] });
      }

      // Gasta XP
      const ok = await gastarXP(msg.author.id, guildId, item.preco, `loja_${item.id}`);
      if (!ok) return msg.reply({ embeds: [embedErro(`XP insuficiente! Este item custa **${item.preco} XP**.\nUse \`!xp\` para ver seu saldo.`)] });

      // Adiciona ao inventário usando colunas planas
      const filter  = { userId: msg.author.id, guildId };
      const upsertOpts = { upsert: true, new: true };
      if (item.tipo === 'badge') {
        await Usuario.findOneAndUpdate(filter, { $push: { badges: item.id }, $setOnInsert: filter }, upsertOpts);
      } else if (item.tipo === 'efeito') {
        await Usuario.findOneAndUpdate(filter, { $push: { efeitos: item.id }, $setOnInsert: filter }, upsertOpts);
      } else if (item.tipo === 'moldura') {
        await Usuario.findOneAndUpdate(filter, { $set: { moldura: item.id }, $setOnInsert: filter }, upsertOpts);
      } else if (item.tipo === 'consumivel') {
        const xpBonus = item.id === 'xp_boost_max' ? 150 : 50;
        // Usa ganharXP para crédito — nunca $inc direto
        await import('./xpSystem.mjs').then(m =>
          m.ganharXP(msg.author.id, guildId, xpBonus, 'loja_boost')
        ).catch(() => {});
      }

      const cor = TIPO_COR[item.tipo] || 0x2ecc71;
      return msg.reply({ embeds: [new EmbedBuilder()
        .setColor(cor)
        .setTitle('✅ Compra Realizada!')
        .setDescription(`Você comprou **${item.nome}**!\n${item.desc}`)
        .addFields({ name: '💳 Custo', value: `${item.preco} XP`, inline: true })
        .setFooter({ text: 'Use !inventario para ver seus itens' })
        .setTimestamp()] });
    }

    /* ===== !inventario ===== */
    if (cmd === 'inventario') {
      const alvo = msg.mentions.users.first() || msg.author;
      const u    = await Usuario.findOne({ userId: alvo.id, guildId });
      const inv  = u?.inventario || {};

      const moldura = u?.moldura || 'padrão';
      const badges  = (u?.badges  || []).map(b => ITENS.find(i => i.id === b)?.nome || b);
      const efeitos = (u?.efeitos || []).map(e => ITENS.find(i => i.id === e)?.nome || e);

      const embed = new EmbedBuilder()
        .setColor(0x00a2ff)
        .setTitle(`🎒 Inventário — ${alvo.globalName || alvo.username}`)
        .setThumbnail(alvo.displayAvatarURL({ size: 64 }))
        .addFields(
          { name: '🖼️ Moldura', value: moldura, inline: true },
          { name: '🏅 Badges', value: badges.length ? badges.join(', ') : 'Nenhum', inline: false },
          { name: '✨ Efeitos', value: efeitos.length ? efeitos.join(', ') : 'Nenhum', inline: false },
        )
        .setFooter({ text: 'Use !loja para ver itens disponíveis' })
        .setTimestamp();

      return msg.reply({ embeds: [embed] });
    }
  });

  // Botões de paginação da loja
  client.on('interactionCreate', async (interaction) => {
    try {
      if (!interaction.isButton()) return;
      const { customId } = interaction;
      if (!customId.startsWith('loja_prev:') && !customId.startsWith('loja_next:')) return;

      const [acao, userId, pageStr] = customId.split(':');
      if (interaction.user.id !== userId)
        return interaction.reply({ content: '❌ Este menu não é seu.', ephemeral: true });

      const pageAtual = parseInt(pageStr);
      const totalPag  = Math.ceil(ITENS.length / 5);
      const novaPage  = acao === 'loja_prev' ? pageAtual - 1 : pageAtual + 1;
      const p         = Math.max(0, Math.min(novaPage, totalPag - 1));

      const u     = await Usuario.findOne({ userId, guildId: interaction.guild.id });
      const saldo = u?.xpDisponivel || 0;

      const embed = embedLoja(p).addFields({ name: '💰 Seu saldo', value: `**${saldo.toLocaleString('pt-BR')} XP**`, inline: true });
      const botoes = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`loja_prev:${userId}:${p}`)
          .setLabel('◀ Anterior')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(p === 0),
        new ButtonBuilder()
          .setCustomId(`loja_next:${userId}:${p}`)
          .setLabel('Próxima ▶')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(p >= totalPag - 1),
      );

      await interaction.update({ embeds: [embed], components: [botoes] });
    } catch {}
  });
}
