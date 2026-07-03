import { EmbedBuilder } from 'discord.js';
import Afinidade from '../../db/models/Afinidade.mjs';
import Casamento from '../../db/models/Casamento.mjs';
import { embedErro } from '../../utils/embeds.mjs';
import { nivelAfinidade } from '../../utils/nivelCalc.mjs';

function chaveAfin(u1, u2) {
  return u1 < u2 ? [u1, u2] : [u2, u1];
}

const MAX_PONTOS_REF = 2000;

function classificacaoPorcentagem(pontos) {
  const pct = Math.min(100, Math.round((pontos / MAX_PONTOS_REF) * 100));
  if (pct <= 20) return { label: '💀 Incompatíveis', cor: 0x95a5a6, pct };
  if (pct <= 40) return { label: '⚠️ Conhecidos',    cor: 0xf39c12, pct };
  if (pct <= 60) return { label: '🤝 Amigos',        cor: 0x3498db, pct };
  if (pct <= 80) return { label: '💖 Próximos',      cor: 0xa855f7, pct };
  if (pct <= 99) return { label: '💘 Especiais',     cor: 0xff69b4, pct };
  return                { label: '❤️ Alma Gêmea',   cor: 0xe74c3c, pct };
}

function gerarBarra(pct, tamanho = 10) {
  const f = Math.round((pct / 100) * tamanho);
  return '█'.repeat(Math.max(0, f)) + '░'.repeat(Math.max(0, tamanho - f));
}

export async function addAfinidade(guildId, userId1, userId2, pontos) {
  const [u1, u2] = chaveAfin(userId1, userId2);
  const agora = new Date();
  const doc = await Afinidade.findOne({ guildId, userId1: u1, userId2: u2 });

  if (doc) {
    const ultimaHora = doc.ultimaInteracao ? (agora - doc.ultimaInteracao) / 3600000 : 99;
    const ganhou = ultimaHora >= 12;
    if (ganhou) {
      doc.pontos += pontos;
      doc.interacoes += 1;
      doc.ultimaInteracao = agora;
      await doc.save();
    } else {
      doc.interacoes += 1;
      await doc.save();
    }
    return { pontos: doc.pontos, ganhou, pontosGanhos: ganhou ? pontos : 0 };
  }

  const novo = await Afinidade.create({ guildId, userId1: u1, userId2: u2, pontos, interacoes: 1, ultimaInteracao: agora });
  return { pontos: novo.pontos, ganhou: true, pontosGanhos: pontos };
}

export const comandos = [
  { cmd: '!afinidade @user', desc: 'Ver afinidade com outro usuário.' },
  { cmd: '!topafinidade',    desc: 'Ranking de casais por afinidade.' },
];

export function register(client, configs) {
  if (client.__afinidadeRegistrado) return;
  client.__afinidadeRegistrado = true;
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();
    const guildId = msg.guild.id;

    if (cmd === 'afinidade') {
      const alvo = msg.mentions.users.first();
      if (!alvo) return msg.reply({ embeds: [embedErro('Mencione um usuário. Exemplo: `!afinidade @usuario`')] });
      if (alvo.bot) return msg.reply({ embeds: [embedErro('Não é possível ver afinidade com bots.')] });
      if (alvo.id === msg.author.id) return msg.reply({ embeds: [embedErro('Você não pode ver sua afinidade consigo mesmo.')] });

      const [u1, u2] = chaveAfin(msg.author.id, alvo.id);
      const doc = await Afinidade.findOne({ guildId, userId1: u1, userId2: u2 });
      const pontos = doc?.pontos || 0;
      const { label, cor, pct } = classificacaoPorcentagem(pontos);
      const barra = gerarBarra(pct);
      const nivel = nivelAfinidade(pontos);

      const embed = new EmbedBuilder()
        .setColor(cor)
        .setTitle(`💜 Afinidade entre ${msg.author.username} e ${alvo.username}`)
        .setDescription(`**${label}**`)
        .addFields(
          { name: '⭐ Pontos', value: `**${pontos}**`, inline: true },
          { name: '📊 Compatibilidade', value: `**${pct}%**`, inline: true },
          { name: '🤝 Interações', value: `**${doc?.interacoes || 0}**`, inline: true },
          { name: '📈 Progresso', value: `${barra} ${pct}%`, inline: false },
          { name: '📅 Última interação', value: doc?.ultimaInteracao
            ? `<t:${Math.floor(new Date(doc.ultimaInteracao).getTime() / 1000)}:R>`
            : 'Nunca', inline: true },
        )
        .setFooter({ text: `Nível: ${nivel?.emoji ?? ''} ${nivel?.nome ?? ''}` })
        .setTimestamp();
      return msg.reply({ embeds: [embed] });
    }

    if (cmd === 'topafinidade') {
      const casamentos = await Casamento.find({ guildId, ativo: true });
      const dados = await Promise.all(casamentos.map(async (c) => {
        const [u1, u2] = chaveAfin(c.userId1, c.userId2);
        const afin = await Afinidade.findOne({ guildId, userId1: u1, userId2: u2 });
        return { c, pontos: afin?.pontos || 0 };
      }));
      dados.sort((a, b) => b.pontos - a.pontos);
      const medals = ['🥇', '🥈', '🥉'];
      const linhas = dados.slice(0, 10).map((d, i) => {
        const { label, pct } = classificacaoPorcentagem(d.pontos);
        const medal = medals[i] || `**#${i + 1}**`;
        return `${medal} <@${d.c.userId1}> 💜 <@${d.c.userId2}> — **${d.pontos}** pts (${pct}% • ${label})`;
      });
      const embed = new EmbedBuilder()
        .setColor(0xa855f7)
        .setTitle('💜 Top Afinidade — Casais Oficiais')
        .setDescription(linhas.join('\n') || 'Nenhum casal registrado ainda.')
        .setTimestamp();
      return msg.reply({ embeds: [embed] });
    }
  });
}
