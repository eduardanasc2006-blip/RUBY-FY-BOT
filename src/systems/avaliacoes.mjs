import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Avaliacao from '../db/models/Avaliacao.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { checkCooldown, formatarTempo } from '../utils/cooldown.mjs';

const sessoesAvaliacao = new Map();

export const comandos = [
  { cmd: '!avaliar <nota> [comentário]', desc: 'Avaliar o servidor (1–5 estrelas).' },
  { cmd: '!avaliacoes',                  desc: 'Ver avaliações do servidor.' },
];

export function register(client, configs) {
  if (client.__avaliacoesRegistrado) return;
  client.__avaliacoesRegistrado = true;

  client.on('messageCreate', async (msg) => {
    try {
    if (msg.author.bot || !msg.guild) return;
    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();
    const guildId = msg.guild.id;

    if (cmd === 'avaliar') {
      const cdKey = `avaliacao:${msg.author.id}:${guildId}`;
      const espera = checkCooldown(cdKey, 3 * 24 * 3600 * 1000);
      if (espera) return msg.reply({ embeds: [embedErro(`Você já avaliou recentemente. Próxima avaliação em **${formatarTempo(espera)}**.`)] });

      const row = new ActionRowBuilder().addComponents(
        [1, 2, 3, 4, 5].map(n =>
          new ButtonBuilder()
            .setCustomId(`avaliacao:nota:${n}:${msg.author.id}:${guildId}`)
            .setLabel('⭐'.repeat(n))
            .setStyle(n <= 2 ? ButtonStyle.Danger : n === 3 ? ButtonStyle.Secondary : ButtonStyle.Success)
        )
      );

      await msg.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('⭐ Avaliar Serviço')
          .setDescription('Selecione uma nota para o serviço:')],
        components: [row],
      });

      sessoesAvaliacao.set(`${msg.author.id}:${guildId}`, { etapa: 'nota' });
      setTimeout(() => sessoesAvaliacao.delete(`${msg.author.id}:${guildId}`), 60_000);
      return;
    }

    if (cmd === 'avaliacoes') {
      const avs = await Avaliacao.find({ guildId }).lean();
      if (!avs.length) return msg.reply({ embeds: [embedErro('Nenhuma avaliação registrada.')] });

      const total = avs.length;
      const media = avs.reduce((acc, a) => acc + a.nota, 0) / total;
      const estrelas = '⭐'.repeat(Math.round(media));
      const ultimas = avs.slice(-5).reverse().map(a =>
        `${'⭐'.repeat(a.nota)} — <@${a.userId}>: *${a.comentario || 'Sem comentário'}*`
      );

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('📊 Avaliações do Servidor')
        .addFields(
          { name: '🔢 Total', value: String(total), inline: true },
          { name: '⭐ Média', value: `${media.toFixed(1)} ${estrelas}`, inline: true },
          { name: '📋 Últimas Avaliações', value: ultimas.join('\n') || 'Nenhuma', inline: false },
        )
        .setTimestamp();
      return msg.reply({ embeds: [embed] });
    }

    const sessaoKey = `${msg.author.id}:${guildId}`;
    if (sessoesAvaliacao.has(sessaoKey)) {
      const s = sessoesAvaliacao.get(sessaoKey);
      if (s.etapa === 'comentario') {
        s.comentario = msg.content.toLowerCase() === 'pular' ? '' : msg.content.slice(0, 200);
        sessoesAvaliacao.delete(sessaoKey);
        await Avaliacao.create({ guildId, userId: msg.author.id, nota: s.nota, comentario: s.comentario });
        return msg.reply({ embeds: [new EmbedBuilder().setColor(0x2ecc71).setDescription(`✅ Obrigado pela avaliação de **${'⭐'.repeat(s.nota)}**!`)] });
      }
    }
    } catch (e) {
      console.error('[Avaliacoes:msg]', e.message);
    }
  });
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() || !interaction.customId.startsWith('avaliacao:nota:')) return;
    if (interaction.replied || interaction.deferred) return;
    const [, , notaStr, userId, guildId] = interaction.customId.split(':');
    if (interaction.user.id !== userId) return interaction.reply({ content: 'Este botão não é para você.', flags: 64 });

    const nota = parseInt(notaStr);
    const sessaoKey = `${userId}:${guildId}`;
    const s = sessoesAvaliacao.get(sessaoKey) || {};
    s.nota = nota;
    s.etapa = 'comentario';
    sessoesAvaliacao.set(sessaoKey, s);

    try { await interaction.update({
      embeds: [new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('⭐ Avaliação — Comentário')
        .setDescription(`Nota: ${'⭐'.repeat(nota)}\n\nEscreva um **comentário** (ou \`pular\`):`).setTimestamp()],
      components: [],
    }); } catch { /* interaction expired */ }
  });
}
