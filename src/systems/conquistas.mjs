import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

import ConquistaModel from '../db/models/Conquista.mjs';
import { LISTA_CONQUISTAS } from '../systems/conquistas.mjs';

const PER_PAGE = 5;

/* =========================
   BARRA DE PROGRESSO
========================= */
function barra(atual, total, size = 10) {
  if (!total || total <= 0) return '░'.repeat(size);

  const pct = Math.round((atual / total) * size);
  const safe = Math.max(0, Math.min(size, pct));

  return '█'.repeat(safe) + '░'.repeat(size - safe);
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

    const render = () => {
      const cat = keys[page] ?? keys[0];
      const itens = categorias[cat] ?? [];

      const list = itens.map(c => {
        const ok = conquistadas.includes(c.id);

        if (c.secreta && !ok) {
          return '🔒 Conquista Secreta';
        }

        return ok
          ? `✅ ${c.nome}`
          : `⬜ ${c.nome}`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle(`🏅 Conquistas de ${target.username}`)
        .setDescription(
          `📂 Categoria: **${cat.toUpperCase()}**\n\n` +
          `${list || 'Nenhuma conquista nesta categoria.'}\n\n` +
          `📊 Desbloqueadas: **${conquistadas.length}**`
        )
        .addFields({
          name: '📈 Progresso geral',
          value: barra(conquistadas.length, LISTA_CONQUISTAS.filter(c => !c.secreta).length),
        })
        .setFooter({
          text: `Página ${page + 1}/${keys.length}`,
        });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`conq_prev:${msg.author.id}`)
          .setLabel('⬅')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0),

        new ButtonBuilder()
          .setCustomId(`conq_next:${msg.author.id}`)
          .setLabel('➡')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === keys.length - 1),
      );

      return { embed, row };
    };

    const { embed, row } = render();

    const message = await msg.reply({
      embeds: [embed],
      components: [row],
    });

    /* =========================
       INTERACTIONS (FIX: NÃO DUPLICAR LISTENER)
    ========================= */
    const collector = message.createMessageComponentCollector({
      time: 120000,
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== msg.author.id) {
        return i.reply({
          content: '❌ Este menu não é seu.',
          ephemeral: true,
        });
      }

      if (i.customId.startsWith('conq_next')) page++;
      if (i.customId.startsWith('conq_prev')) page--;

      if (page < 0) page = 0;
      if (page >= keys.length) page = keys.length - 1;

      const { embed, row } = render();

      await i.update({
        embeds: [embed],
        components: [row],
      });
    });

    collector.on('end', async () => {
      try {
        await message.edit({ components: [] });
      } catch {}
    });
  });
}

/* =========================
   COMANDO LISTADO (AJUDA)
========================= */
export const comandos = [
  {
    cmd: '!conquistas',
    desc: 'Mostra todas as conquistas com progresso e categorias',
  },
];
