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
   SANITIZER (REMOVE □ / EMOJIS QUEBRADOS)
========================= */
function clean(text = '') {
  return String(text)
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '') // emojis
    .replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, '') // chars inválidos
    .replace(/\s+/g, ' ')
    .trim();
}

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
   IMAGEM
========================= */
async function gerarImagem(target, cat, list, page, totalPages, progresso) {
  const canvas = createCanvas(900, 520);
  const ctx = canvas.getContext('2d');

  // fundo
  const bg = ctx.createLinearGradient(0, 0, 900, 520);
  bg.addColorStop(0, '#0a0a12');
  bg.addColorStop(1, '#15152a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 900, 520);

  // card
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(30, 30, 840, 460);

  // título
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px Arial';
  ctx.fillText('CONQUISTAS', 50, 70);

  ctx.fillStyle = '#aaa';
  ctx.font = '16px Arial';
  ctx.fillText(`Categoria: ${clean(cat).toUpperCase()}`, 50, 100);

  // lista
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px Arial';

  let y = 160;
  for (const line of list) {
    ctx.fillText(clean(line), 70, y);
    y += 30;
  }

  // barra fundo
  const x = 70;
  const yBar = 420;
  const w = 600;
  const h = 18;

  ctx.fillStyle = '#1b1b2b';
  ctx.fillRect(x, yBar, w, h);

  // barra progresso
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, '#ff4d6d');
  grad.addColorStop(1, '#4dd6ff');

  ctx.fillStyle = grad;
  ctx.fillRect(x, yBar, (w * progresso) / 100, h);

  // % texto
  ctx.fillStyle = '#fff';
  ctx.font = '14px Arial';
  ctx.fillText(`${progresso}%`, x + w + 15, yBar + 14);

  // página
  ctx.fillStyle = '#888';
  ctx.fillText(`Página ${page + 1}/${totalPages}`, 760, 490);

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

        if (c.secreta && !ok) return '🔒 Secreta';

        return ok ? `✔ ${c.nome}` : `- ${c.nome}`;
      });

      const progresso = Math.round(
        (conquistadas.length /
          LISTA_CONQUISTAS.filter(c => !c.secreta).length) * 100
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
          .setCustomId(`conq_prev_${target.id}`)
          .setLabel('⬅')
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId(`conq_next_${target.id}`)
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
      // 🔥 FIX: agora só o dono do menu pode interagir
      if (i.user.id !== target.id) {
        return i.reply({
          content: '❌ Este menu não é seu.',
          ephemeral: true,
        });
      }

      if (i.customId.includes('next')) page++;
      if (i.customId.includes('prev')) page--;

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
    desc: 'Exibe conquistas em layout visual em imagem',
  },
];
