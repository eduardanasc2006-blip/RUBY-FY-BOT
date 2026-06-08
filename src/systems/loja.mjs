import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder,
  } from 'discord.js';

  import Usuario from '../db/models/Usuario.mjs';
  import { gastarXP, ganharXP } from './xpSystem.mjs';
  import { createCanvas } from '@napi-rs/canvas';

  const ITENS = [
    { id: 'moldura_ouro',    nome: '🖼️ Moldura Dourada', tipo: 'moldura',    preco: 500,  desc: 'Moldura dourada para o perfil.' },
    { id: 'moldura_neon',    nome: '🔮 Moldura Neon',     tipo: 'moldura',    preco: 800,  desc: 'Moldura com efeito neon colorido.' },
    { id: 'moldura_foguete', nome: '🚀 Moldura Galáxia',  tipo: 'moldura',    preco: 1200, desc: 'Moldura espacial premium.' },
    { id: 'badge_estrela',   nome: '⭐ Badge Estrela',    tipo: 'badge',      preco: 300,  desc: 'Badge de estrela para o perfil.' },
    { id: 'badge_fogo',      nome: '🔥 Badge Chama',      tipo: 'badge',      preco: 400,  desc: 'Badge de chama ardente.' },
    { id: 'badge_coroa',     nome: '👑 Badge Realeza',    tipo: 'badge',      preco: 700,  desc: 'Badge exclusivo de realeza.' },
    { id: 'badge_diamante',  nome: '💎 Badge Diamante',   tipo: 'badge',      preco: 1000, desc: 'Badge raro de diamante.' },
    { id: 'efeito_confete',  nome: '🎊 Efeito Confete',  tipo: 'efeito',     preco: 600,  desc: 'Confetes no perfil.' },
    { id: 'efeito_aurora',   nome: '🌌 Efeito Aurora',    tipo: 'efeito',     preco: 900,  desc: 'Aurora boreal no perfil.' },
    { id: 'xp_boost_mini',   nome: '⚡ XP Boost Mini',    tipo: 'consumivel', preco: 200,  desc: '+50 XP instantâneos.', xpBonus: 50 },
    { id: 'xp_boost_max',    nome: '🚀 XP Boost Max',     tipo: 'consumivel', preco: 500,  desc: '+150 XP instantâneos.', xpBonus: 150 },
  ];

  const ITENS_POR_PAGINA = 5;

  async function renderPreviewPerfil(userId, item) {
    try {
      const canvas = createCanvas(700, 350);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#1e1f22'; ctx.fillRect(0, 0, 700, 350);
      ctx.fillStyle = '#2b2d31'; ctx.fillRect(20, 20, 660, 310);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 28px Sans';
      ctx.fillText(`Usuário ${userId}`, 60, 80);
      ctx.font = 'bold 22px Sans'; ctx.fillStyle = '#00a2ff';
      ctx.fillText(`Preview: ${item.nome}`, 60, 120);
      ctx.font = '16px Sans'; ctx.fillStyle = '#aaa';
      ctx.fillText(item.desc, 60, 150);
      ctx.fillStyle = '#00ff88'; ctx.fillText(`${item.preco} XP`, 60, 180);
      if (item.tipo === 'moldura') { ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 6; ctx.strokeRect(30, 30, 640, 290); }
      if (item.tipo === 'efeito') { for (let i = 0; i < 40; i++) { ctx.fillStyle = '#00ff88'; ctx.fillRect(Math.random() * 700, Math.random() * 350, 3, 3); } }
      return canvas.toBuffer('image/png');
    } catch {
      const fallback = createCanvas(700, 350);
      const ctx = fallback.getContext('2d');
      ctx.fillStyle = '#1e1f22'; ctx.fillRect(0, 0, 700, 350);
      ctx.fillStyle = '#aaa'; ctx.font = '20px Sans';
      ctx.fillText(item.nome + ' — ' + item.preco + ' XP', 40, 180);
      return fallback.toBuffer('image/png');
    }
  }

  function embedLoja(page = 0, index = 0) {
    const start = page * ITENS_POR_PAGINA;
    const itens = ITENS.slice(start, start + ITENS_POR_PAGINA);
    const itemAtual = ITENS[index];
    return new EmbedBuilder()
      .setColor(0x00a2ff)
      .setTitle('🛍️ Loja FiskBot')
      .setDescription(itens.map(i => `🛒 **${i.nome}** — ${i.preco} XP`).join('\n\n'))
      .addFields({ name: '🔎 Item selecionado', value: `**${itemAtual.nome}**\n${itemAtual.desc}\n💰 ${itemAtual.preco} XP` })
      .setFooter({ text: `Página ${page + 1} | Item ${index + 1}/${ITENS.length}` });
  }

  function _buildNavRow(userId, index) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`shop_prev:${userId}:${index}`).setLabel('⬅').setStyle(ButtonStyle.Secondary).setDisabled(index <= 0),
      new ButtonBuilder().setCustomId(`shop_next:${userId}:${index}`).setLabel('➡').setStyle(ButtonStyle.Secondary).setDisabled(index >= ITENS.length - 1),
      new ButtonBuilder().setCustomId(`shop_buy:${userId}:${index}`).setLabel('Comprar').setStyle(ButtonStyle.Success),
    );
  }

  export function register(client, configs) {
    if (client.__lojaRegistrado) return;
    client.__lojaRegistrado = true;

    client.on('messageCreate', async (msg) => {
      if (!msg.guild || msg.author.bot) return;
      const cfg = configs.get(msg.guild.id);
      const prefixo = cfg?.prefixo || '!';
      if (!msg.content.startsWith(prefixo)) return;
      const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
      const cmd = args.shift().toLowerCase();
      if (cmd !== 'loja') return;

      const index = 0;
      const itens = ITENS.slice(0, ITENS_POR_PAGINA);
      const itemAtual = ITENS[index];
      const buffer = await renderPreviewPerfil(msg.author.id, itemAtual);
      const file = new AttachmentBuilder(buffer, { name: 'preview.png' });

      const rowItens = new ActionRowBuilder().addComponents(
        itens.map((item, i) => new ButtonBuilder().setCustomId(`shop_select:${msg.author.id}:${i}`).setLabel(item.nome.slice(0, 12)).setStyle(ButtonStyle.Primary))
      );

      return msg.reply({ embeds: [embedLoja(0, index)], files: [file], components: [rowItens, _buildNavRow(msg.author.id, index)] });
    });

    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isButton()) return;
      const [type, userId, value] = interaction.customId.split(':');
      if (!['shop_select','shop_prev','shop_next','shop_buy'].includes(type)) return;

      if (interaction.user.id !== userId)
        return interaction.reply({ content: '❌ Não é seu menu.', flags: 64 });

      let index = parseInt(value);

      if (type === 'shop_select') {
        await interaction.deferUpdate();
        const item = ITENS[index];
        const buffer = await renderPreviewPerfil(userId, item);
        const file = new AttachmentBuilder(buffer, { name: 'preview.png' });
        return interaction.editReply({ embeds: [embedLoja(0, index)], files: [file], components: [_buildNavRow(userId, index)] });
      }

      if (type === 'shop_next') index = Math.min(ITENS.length - 1, index + 1);
      if (type === 'shop_prev') index = Math.max(0, index - 1);

      if (type === 'shop_prev' || type === 'shop_next') {
        await interaction.deferUpdate();
        const item = ITENS[index];
        const buffer = await renderPreviewPerfil(userId, item);
        const file = new AttachmentBuilder(buffer, { name: 'preview.png' });
        return interaction.editReply({ embeds: [embedLoja(0, index)], files: [file], components: [_buildNavRow(userId, index)] });
      }

      if (type === 'shop_buy') {
        const item = ITENS[index];
        const guildId = interaction.guild.id;

        const u = await Usuario.findOne({ userId, guildId });

        if (item.tipo !== 'consumivel') {
          const campo = item.tipo === 'moldura' ? 'moldura' : item.tipo === 'badge' ? 'badges' : 'efeitos';
          const owned = item.tipo === 'moldura' ? (u?.moldura ? [u.moldura] : []) : (Array.isArray(u?.[campo]) ? u[campo] : []);
          if (owned.includes(item.id))
            return interaction.reply({ content: `❌ Você já possui **${item.nome}**.`, flags: 64 });
        }

        const ok = await gastarXP(userId, guildId, item.preco, `shop_${item.id}`);
        if (!ok)
          return interaction.reply({ content: '❌ XP insuficiente.', flags: 64 });

        try {
          if (item.tipo === 'moldura') {
            await Usuario.updateOne({ userId, guildId }, { $set: { moldura: item.id } });
          } else if (item.tipo === 'badge') {
            const current = Array.isArray(u?.badges) ? u.badges : [];
            await Usuario.updateOne({ userId, guildId }, { $set: { badges: [...current, item.id] } });
          } else if (item.tipo === 'efeito') {
            const current = Array.isArray(u?.efeitos) ? u.efeitos : [];
            await Usuario.updateOne({ userId, guildId }, { $set: { efeitos: [...current, item.id] } });
          } else if (item.tipo === 'consumivel') {
            await ganharXP(userId, guildId, item.xpBonus || 50, `consumivel_${item.id}`);
          }
        } catch (err) {
          await ganharXP(userId, guildId, item.preco, `reembolso_${item.id}`);
          return interaction.reply({ content: '❌ Erro ao salvar item. XP devolvido.', flags: 64 });
        }

        const msg = item.tipo === 'consumivel'
          ? `✅ **${item.nome}** usada! +${item.xpBonus} XP adicionado.`
          : `✅ **${item.nome}** comprada e adicionada ao seu perfil!`;

        return interaction.update({ content: msg, components: [], files: [] });
      }
    });
  }

  export const comandos = [
    { cmd: '!loja', desc: 'Abre a loja de itens cosméticos do perfil.' },
  ];
  