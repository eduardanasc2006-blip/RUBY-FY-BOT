import {
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

import { createCanvas } from '@napi-rs/canvas';
import ConquistaModel from '../db/models/Conquista.mjs';
import { LISTA_CONQUISTAS } from './conquistasBase.mjs';

/* =========================
   CATEGORIAS
========================= */
function getCategorias() {
  const cats = {};
  for (const c of LISTA_CONQUISTAS) {
    if (!cats[c.cat]) cats[c.cat] = [];
    cats[c.cat].push(c);
  }
  return cats;
}

/* =========================
   BARRA
========================= */
function barra(atual, total, size = 18) {
  if (!total) return '░'.repeat(size);

  const pct = Math.round((atual / total) * size);
  const safe = Math.max(0, Math.min(size, pct));

  return '█'.repeat(safe) + '░'.repeat(size - safe);
}

/* =========================
   IMAGEM DO MENU
========================= */
async function gerarImagem(target, cat, list, page, totalPages, progresso) {
  const canvas = createCanvas(900, 520);
  const ctx = canvas.getContext('2d');

  // fundo
  const bg = ctx.createLinearGradient(0, 0, 900, 520);
  bg.addColorStop(0, '#0b0b14');
  bg.addColorStop(1, '#141428');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 900, 520);

  // título
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px Arial';
  ctx.fillText('CONQUISTAS', 40, 60);

  ctx.font = '16px Arial';
  ctx.fillStyle = '#aaaaaa';
  ctx.fillText(`Categoria: ${cat.toUpperCase()}`, 40, 90);

  // lista
  ctx.font = '20px Arial';
  ctx.fillStyle = '#ffffff';

  let y = 150;
  for (const line of list) {
    ctx.fillText(line, 60, y);
    y += 30;
  }

  // barra
  const barX = 60;
  const barY = 420;
  const barW = 600;
  const barH = 18;

  ctx.fillStyle = '#1e1e2f';
  ctx.fillRect(barX, barY, barW, barH);

  ctx.fillStyle = '#00d4ff';
  ctx.fillRect(barX, barY, (barW * progresso) / 100, barH);

  ctx.fillStyle = '#fff';
  ctx.font = '16px Arial';
  ctx.fillText(`${progresso}%`, barX + barW + 20, barY + 15);

  // página
  ctx.fillStyle = '#888';
  ctx.fillText(`Página ${page + 1}/${totalPages}`, 750, 490);

  return canvas.toBuffer('image/png');
}

/* =========================
   REGISTER
========================= */
export function register(client, configs) {
  if (client.__conq) return;
  client.__conq = true;

  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;

    const prefix = configs.get(msg.guild.id)?.prefixo || '!';
    if (!msg.content.startsWith(prefix)) return;

    const args = msg.content.slice(prefix.length).trim().split(/\s+/);
    const cmd = args.shift()?.toLowerCase();

    if (cmd !== 'conquistas') return;

    const target = msg.mentions.users.first() || msg.author;

    const doc = await ConquistaModel.findOne({
      userId: target.id,
      guildId: msg.guild.id,
    });

    const conquistadas = doc?.conquistas ?? [];

    const categorias = getCategorias();
    const keys = Object.keys(categorias);

    let page = 0;

    const render = async () => {
      const cat = keys[page] ?? keys[0];
      const itens = categorias[cat] ?? [];

      const list = itens.map(c => {
        const ok = conquistadas.includes(c.id);

        if (c.secreta && !ok) return '🔒 Conquista Secreta';
        return ok ? `✓ ${c.nome}` : `- ${c.nome}`;
      });

      const progresso = Math.round(
        (conquistadas.length / LISTA_CONQUISTAS.filter(c => !c.secreta).length) * 100
      );

      const img = await gerarImagem(
        target,
        cat,
        list,
        page,
        keys.length,
        progresso
      );

      const file = new AttachmentBuilder(img, { name: 'conquistas.png' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('⬅')
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('➡')
          .setStyle(ButtonStyle.Secondary),
      );

      return { files: [file], components: [row] };
    };

    const message = await msg.reply(await render());

    const collector = message.createMessageComponentCollector({
      time: 120000,
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== msg.author.id) return i.deferUpdate();

      if (i.customId === 'next') page++;
      if (i.customId === 'prev') page--;

      if (page < 0) page = 0;
      if (page >= keys.length) page = keys.length - 1;

      await i.update(await render());
    });

    collector.on('end', async () => {
      try {
        await message.edit({ components: [] });
      } catch {}
    });
  });
}

/* =========================
   AJUDA
========================= */
export const comandos = [
  {
    cmd: '!conquistas',
    desc: 'Mostra conquistas em layout visual (imagem)',
  },
];
