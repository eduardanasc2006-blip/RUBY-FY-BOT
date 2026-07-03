import { EmbedBuilder } from 'discord.js';

export const comandos = [{ cmd: '!trivia', desc: 'Responder uma pergunta de trivia' }];

const PERGUNTAS = [
  { p: 'Qual é a capital do Brasil?', r: 'brasilia', d: 'Brasília' },
  { p: 'Quantos lados tem um hexágono?', r: '6', d: '6' },
  { p: 'Qual é o maior planeta do sistema solar?', r: 'jupiter', d: 'Júpiter' },
  { p: 'Em que ano o Brasil foi descoberto?', r: '1500', d: '1500' },
  { p: 'Qual linguagem roda no Node.js?', r: 'javascript', d: 'JavaScript' },
];

const ativas = new Map();

export function register(client, configs) {
  if (client.__triviaRegistrado) return;
  client.__triviaRegistrado = true;

  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    const cfg = configs.get(msg.guild.id);
    const p = cfg?.prefixo ?? '!';
    if (!msg.content.startsWith(p)) return;
    const parts = msg.content.slice(p.length).trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();

    if (cmd === 'trivia') {
      if (ativas.has(msg.channel.id)) return msg.reply('❌ Já tem uma trivia ativa neste canal!');
      const q = PERGUNTAS[Math.floor(Math.random() * PERGUNTAS.length)];
      ativas.set(msg.channel.id, { ...q, userId: msg.author.id, expires: Date.now() + 30000 });
      setTimeout(() => { if (ativas.get(msg.channel.id)?.expires <= Date.now()) ativas.delete(msg.channel.id); }, 31000);
      await msg.reply({ embeds: [
        new EmbedBuilder().setColor(0x1abc9c).setTitle('🧠 Trivia!').setDescription(`**${q.p}**\nResponda em 30 segundos!`)
      ]});
      return;
    }

    const trivia = ativas.get(msg.channel.id);
    if (trivia && Date.now() < trivia.expires) {
      const resp = msg.content.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (resp === trivia.r.normalize('NFD').replace(/[\u0300-\u036f]/g, '')) {
        ativas.delete(msg.channel.id);
        await msg.reply({ embeds: [
          new EmbedBuilder().setColor(0x2ecc71).setTitle('✅ Correto!').setDescription(`A resposta era **${trivia.d}**! Parabéns **${msg.author.username}**! 🎉`)
        ]});
      }
    }
  });
}
