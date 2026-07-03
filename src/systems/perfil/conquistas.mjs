import {
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

import { createCanvas } from '@napi-rs/canvas';
import ConquistaModel from '../../db/models/Conquista.mjs';
import { LISTA_CONQUISTAS } from '../progresso/conquistasBase.mjs';

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
function barra(atual, total, size = 20) {
  if (!total) return '░'.repeat(size);

  const pct = Math.round((atual / total) * size);
  const safe = Math.max(0, Math.min(size, pct));

  return '█'.repeat(safe) + '░'.repeat(size - safe);
}

async function gerarImagem(target, cat, list, page, totalPages, progresso) {
  const canvas = createCanvas(1000, 600);
  const ctx = canvas.getContext('2d');

  /* =========================
     FUNDO FISK
  ========================= */

  const bg = ctx.createLinearGradient(0, 0, 1000, 600);
  bg.addColorStop(0, '#071426');
  bg.addColorStop(0.5, '#10294a');
  bg.addColorStop(1, '#0b1730');

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1000, 600);

  /* brilho lateral */

  const glow = ctx.createRadialGradient(
    850, 120, 0,
    850, 120, 400
  );

  glow.addColorStop(0, 'rgba(0,200,255,0.20)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1000, 600);

  /* =========================
     CARD
  ========================= */

  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(35, 35, 930, 530);

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  ctx.strokeRect(35, 35, 930, 530);

  /* =========================
     TOPO
  ========================= */

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px Sans';

  ctx.fillText(
    'CONQUISTAS',
    70,
    90
  );

  ctx.fillStyle = '#67d4ff';
  ctx.font = '22px Sans';

  ctx.fillText(
    target.username,
    70,
    125
  );

  /* Badge categoria */

  ctx.fillStyle = '#1f6fff';
  ctx.beginPath();
  ctx.roundRect(70, 145, 210, 38, 10);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Sans';

  ctx.fillText(
    cat.toUpperCase(),
    88,
    171
  );

  /* linha */

  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.beginPath();
  ctx.moveTo(70, 205);
  ctx.lineTo(930, 205);
  ctx.stroke();

  /* =========================
     LISTA
  ========================= */

  let y = 255;

  for (const line of list.slice(0, 10)) {

    const concluida = line.startsWith('✔');
    const bloqueada = line.startsWith('✖');

    if (concluida) {

      ctx.fillStyle = '#2ecc71';

      ctx.beginPath();
      ctx.arc(80, y - 8, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '22px Sans';

      ctx.fillText(
        line.replace('✔ ', ''),
        100,
        y
      );

    } else if (bloqueada) {

      ctx.fillStyle = '#ff6b6b';

      ctx.beginPath();
      ctx.arc(80, y - 8, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#d6d6d6';
      ctx.font = '22px Sans';

      ctx.fillText(
        line.replace('✖ ', ''),
        100,
        y
      );

    } else {

      ctx.fillStyle = '#888';

      ctx.font = '22px Sans';

      ctx.fillText(
        line,
        100,
        y
      );
    }

    y += 38;
  }

  /* =========================
     BARRA PROGRESSO
  ========================= */

  const bx = 70;
  const by = 500;
  const bw = 760;
  const bh = 24;

  ctx.fillStyle = '#13233d';
  ctx.fillRect(bx, by, bw, bh);

  const prog = ctx.createLinearGradient(
    bx,
    0,
    bx + bw,
    0
  );

  prog.addColorStop(0, '#00d4ff');
  prog.addColorStop(0.5, '#4f8cff');
  prog.addColorStop(1, '#7d5fff');

  ctx.fillStyle = prog;
  ctx.fillRect(
    bx,
    by,
    (bw * progresso) / 100,
    bh
  );

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Sans';

  ctx.fillText(
    `${progresso}%`,
    bx + bw + 20,
    by + 18
  );

  /* =========================
     RODAPÉ
  ========================= */

  ctx.fillStyle = '#9ea7b3';
  ctx.font = '18px Sans';

  ctx.fillText(
    `Página ${page + 1}/${totalPages}`,
    820,
    555
  );

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

    // ID ÚNICO DO MENU (CORREÇÃO DO ERRO "não é seu menu")
    const menuId = `${msg.id}-${Date.now()}`;

    const render = async () => {
      const cat = keys[page] ?? keys[0];
      const itens = categorias[cat] ?? [];

      const list = itens.map(c => {
        const ok = conquistadas.includes(c.id);

        if (c.secreta && !ok) return '🔒 Conquista Secreta';
        return ok ? `✔ ${c.nome}` : `✖ ${c.nome}`;
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

      const file = new AttachmentBuilder(img, {
        name: 'conquistas.png',
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`conq_prev_${menuId}`)
          .setLabel('⬅')
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId(`conq_next_${menuId}`)
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
      // 🔥 CORREÇÃO DEFINITIVA DO "não é seu menu"
      if (i.user.id !== msg.author.id) {
        return i.reply({
          content: '❌ Este menu não é seu.',
          ephemeral: true,
        });
      }

      // garante que não pega outro menu antigo
      if (!i.customId.includes(menuId)) return;

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
    desc: 'Mostra conquistas em painel visual moderno',
  },
];
