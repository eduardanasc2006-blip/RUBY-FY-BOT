import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

import ConquistaModel from '../db/models/Conquista.mjs';
import { LISTA_CONQUISTAS } from '../systems/conquistas.mjs';

const PER_PAGE = 4;

function barra(progresso, total, size = 10) {
  const pct = Math.floor((progresso / total) * size);
  return '█'.repeat(pct) + '░'.repeat(size - pct);
}

function getCategorias() {
  const cats = {};
  for (const c of LISTA_CONQUISTAS) {
    if (!cats[c.cat]) cats[c.cat] = [];
    cats[c.cat].push(c);
  }
  return cats;
}

export function register(client, configs) {
  if (client.__conq) return;
  client.__conq = true;

  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;

    const prefix = configs.get(msg.guild.id)?.prefixo || '!';
    if (!msg.content.startsWith(prefix)) return;

    const args = msg.content.slice(prefix.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    if (cmd !== 'conquistas') return;

    const target = msg.mentions.users.first() || msg.author;

    const doc = await ConquistaModel.findOne({
      userId: target.id,
      guildId: msg.guild.id,
    });

    const conquistadas = doc?.conquistas || [];

    const visiveis = LISTA_CONQUISTAS.filter(c => !c.secreta).length;
    const total = conquistadas.length;

    const categorias = getCategorias();
    const keys = Object.keys(categorias);

    let page = 0;

    const render = () => {
      const cat = keys[page];
      const itens = categorias[cat];

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
          `📊 Progresso geral: **${total}** desbloqueadas\n` +
          `📦 Visíveis: **${visiveis}** conquistas\n\n` +
          `📂 Categoria: **${cat.toUpperCase()}**\n\n` +
          `${list}`
        )
        .addFields({
          name: '📈 Progresso visual',
          value: barra(total, visiveis),
        })
        .setFooter({ text: `Página ${page + 1}/${keys.length}` });

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

    client.on('interactionCreate', async (i) => {
      if (!i.isButton()) return;
      if (!i.customId.startsWith('conq_')) return;
      if (i.user.id !== msg.author.id) return;

      if (i.customId.startsWith('conq_next')) page++;
      if (i.customId.startsWith('conq_prev')) page--;

      const { embed, row } = render();
      await i.update({ embeds: [embed], components: [row] });
    });
  });
}

export const comandos = [
  {
    cmd: '!conquistas',
    desc: 'Mostra suas conquistas com progresso detalhado',
  },
];
