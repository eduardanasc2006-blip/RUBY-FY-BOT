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
function barra(atual, total, size = 20) {
  if (!total) return '░'.repeat(size);

  const pct = Math.round((atual / total) * size);
  const safe = Math.max(0, Math.min(size, pct));

  return '█'.repeat(safe) + '░'.repeat(size - safe);
}

/* =========================
   IMAGEM ULTRA MELHORADA
========================= */
async function gerarImagem(target, cat, list, page, totalPages, progresso) {
  const canvas = createCanvas(1000, 600);
  const ctx = canvas.getContext('2d');

  // fundo gradiente moderno
  const bg = ctx.createLinearGradient(0, 0, 1000, 600);
  bg.addColorStop(0, '#0a0a14');
  bg.addColorStop(0.5, '#12122a');
  bg.addColorStop(1, '#07070f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1000, 600);

  // card principal
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(40, 40, 920, 520);

  // topo
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px Arial';
  ctx.fillText('🏅 CONQUISTAS', 70, 90);

  ctx.fillStyle = '#9aa0ff';
  ctx.font = '18px Arial';
  ctx.fillText(`Jogador: ${target.username}`, 70, 120);

  ctx.fillStyle = '#cccccc';
  ctx.fillText(`Categoria: ${cat.toUpperCase()}`, 70, 150);

  // separador
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(70, 170);
  ctx.lineTo(930, 170);
  ctx.stroke();

  // lista estilizada
  ctx.font = '20px Arial';
  let y = 220;

  for (const line of list.slice(0, 10)) {
    ctx.fillStyle = line.includes('✔')
      ? '#4dff88'
      : line.includes('🔒')
      ? '#888'
      : '#ffffff';

    ctx.fillText(line, 90, y);
    y += 34;
  }

  // barra de progresso moderna
  const x = 90;
  const yBar = 480;
  const w = 700;
  const h = 22;

  // fundo barra
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(x, yBar, w, h);

  // gradiente barra
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, '#ff4d6d');
  grad.addColorStop(0.5, '#6c63ff');
  grad.addColorStop(1, '#4dd6ff');

  ctx.fillStyle = grad;
  ctx.fillRect(x, yBar, (w * progresso) / 100, h);

  // porcentagem
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px Arial';
  ctx.fillText(`${progresso}%`, x + w + 20, yBar + 16);

  // página
  ctx.fillStyle = '#777';
  ctx.fillText(`Página ${page + 1}/${totalPages}`, 820, 560);

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
