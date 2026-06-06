import {
  EmbedBuilder
} from 'discord.js';
import {
  ganharXP,
  gastarXP,
  temXP
} from './xpSystem.mjs';

/* =========================
   COMANDOS EXPORTADOS
========================= */

export const comandos = [
  { cmd: '!8ball <pergunta>', desc: 'Bola mágica 8 — responde sua pergunta.' },
  { cmd: '!dado [faces]', desc: 'Rola um dado (padrão 6 faces).' },
  { cmd: '!coinflip', desc: 'Cara ou coroa.' },
  { cmd: '!ppt @user [xp]', desc: 'Pedra, papel ou tesoura valendo XP.' },
  { cmd: '!roleta', desc: 'Sorteia um membro aleatório online.' },
  { cmd: '!escolher item1, item2, item3', desc: 'Escolhe entre opções separadas por vírgula.' },
];

/* =========================
   UTIL
========================= */

const RESPOSTAS_8BALL = [
  '✅ Com certeza!',
  '✅ Sem dúvidas.',
  '✅ Pode apostar nisso.',
  '✅ Sim.',
  '✨ Os sinais apontam que sim.',
  '🤔 Talvez.',
  '🤔 Difícil dizer agora.',
  '🤔 Pergunte novamente mais tarde.',
  '😶 Não tenho certeza.',
  '❌ Não.',
  '❌ Minhas fontes dizem que não.',
  '❌ Muito improvável.',
  '❌ Nem pensar.',
  '💀 Melhor não contar com isso.'
];

/* =========================
   REGISTER
========================= */

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';

    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    /* =========================
       8BALL
    ========================= */

    if (cmd === '8ball') {
      const pergunta = args.join(' ');
      if (!pergunta) return msg.reply('❓ Faça uma pergunta!');

      const resp = RESPOSTAS_8BALL[Math.floor(Math.random() * RESPOSTAS_8BALL.length)];

      const embed = new EmbedBuilder()
  .setColor(0x9b59b6)
  .setTitle('🎱 Bola Mágica')
  .setDescription(
    `❓ **Pergunta**\n${pergunta}\n\n` +
    `🔮 **Resposta**\n${resp}`
  );

      return msg.reply({ embeds: [embed] });
    }

    /* =========================
       DADO
    ========================= */

    if (cmd === 'dado') {
      const faces = parseInt(args[0]) || 6;
      const r = Math.floor(Math.random() * faces) + 1;
      return msg.reply(`🎲 Resultado: **${r}**`);
    }

    /* =========================
       COINFLIP
    ========================= */

    if (cmd === 'coinflip') {
      return msg.reply(Math.random() < 0.5 ? '🪙 Cara' : '🪙 Coroa');
    }

    /* =========================
       PPT (PvP + XP)
    ========================= */

   if (cmd === 'ppt') {
const alvo = msg.mentions.users.first();
const aposta = parseInt(args.find(a => !isNaN(a))) || 0;

if (!alvo) {
return msg.reply('❌ Use: `!ppt @usuario [xp]`');
}

if (alvo.id === msg.author.id) {
return msg.reply('❌ Você não pode jogar contra você mesmo.');
}

const opcoes = [
'🪨 Pedra',
'📄 Papel',
'✂️ Tesoura'
];

const escolhaUser =
opcoes[Math.floor(Math.random() * opcoes.length)];

const escolhaAlvo =
opcoes[Math.floor(Math.random() * opcoes.length)];

let resultado = '🤝 Empate!';
let vencedor = null;

const ganhou =
(escolhaUser === '🪨 Pedra' && escolhaAlvo === '✂️ Tesoura') ||
(escolhaUser === '📄 Papel' && escolhaAlvo === '🪨 Pedra') ||
(escolhaUser === '✂️ Tesoura' && escolhaAlvo === '📄 Papel');

const perdeu =
escolhaUser !== escolhaAlvo && !ganhou;

if (ganhou) {
resultado = `🏆 ${msg.author.username} venceu!`;
vencedor = msg.author.id;
} else if (perdeu) {
resultado = `🏆 ${alvo.username} venceu!`;
vencedor = alvo.id;
}

if (aposta > 0 && vencedor) {
  const userTemXP = await temXP(
    msg.author.id,
    msg.guild.id,
    aposta
  );

  const alvoTemXP = await temXP(
    alvo.id,
    msg.guild.id,
    aposta
  );

  if (!userTemXP || !alvoTemXP) {
    return msg.reply(
      `❌ Ambos os jogadores precisam ter pelo menos ${aposta} XP disponível para apostar.`
    );
  }

  const loser =
    vencedor === msg.author.id
      ? alvo.id
      : msg.author.id;

  const perdeuXP = await gastarXP(
    loser,
    msg.guild.id,
    aposta,
    'ppt_loss'
  );

  if (perdeuXP) {
    await ganharXP(
      vencedor,
      msg.guild.id,
      aposta,
      'ppt_win'
    );
  }
}
const loser =
vencedor === msg.author.id
? alvo.id
: msg.author.id;

const perdeuXP = await gastarXP(
  loser,
  msg.guild.id,
  aposta,
  'ppt_loss'
);

if (perdeuXP) {
  await ganharXP(
    vencedor,
    msg.guild.id,
    aposta,
    'ppt_win'
  );
}

}

const embed = new EmbedBuilder()
  .setColor(0x3498db)
  .setTitle('⚔️ Duelo de Pedra, Papel ou Tesoura')
  .addFields(
    {
      name: `👤 ${msg.author.username}`,
      value: escolhaUser,
      inline: true
    },
    {
      name: `👤 ${alvo.username}`,
      value: escolhaAlvo,
      inline: true
    },
    {
      name: '🏆 Resultado',
      value: resultado,
      inline: false
    }
  )
  .setFooter({
    text: aposta > 0
      ? `Aposta: ${aposta} XP`
      : 'Partida amistosa'
  });
      return msg.reply({ embeds: [embed] });
   }
    /* =========================
       ROLETA MELHORADA
    ========================= */

    if (cmd === 'roleta') {
      const membros = msg.guild.members.cache
        .filter(m => !m.user.bot && m.presence?.status !== 'offline');

      const arr = [...(membros.size ? membros : msg.guild.members.cache.filter(m => !m.user.bot)).values()];

      if (!arr.length) return msg.reply('❌ Nenhum membro encontrado.');

      const escolhido = arr[Math.floor(Math.random() * arr.length)];

      const embed = new EmbedBuilder()
.setColor(0xf1c40f)
.setTitle('🎰 Roleta da Sorte')
.setDescription(
`🎲 Girando a roleta...

👥 Participantes: ${arr.length}

🏆 Sorteado:
**${escolhido.displayName}**

✨ Parabéns!`
);

      return msg.reply({ embeds: [embed] });
    }

    /* =========================
       ESCOLHER MELHORADO
    ========================= */

    if (cmd === 'escolher') {
      const texto = args.join(' ');

      if (!texto.includes(',')) {
        return msg.reply('❌ Use vírgulas! Ex: `!escolher pizza, hambúrguer, sushi`');
      }

      const opcoes = texto.split(',').map(s => s.trim()).filter(Boolean);

      if (opcoes.length < 2) {
        return msg.reply('❌ Preciso de pelo menos 2 opções.');
      }

      const escolha = opcoes[Math.floor(Math.random() * opcoes.length)];

     const embed = new EmbedBuilder()
  .setColor(0x2ecc71)
  .setTitle('🎯 Escolha Aleatória')
  .setDescription(
    `📋 Opções:\n${opcoes.map(o => `• ${o}`).join('\n')}\n\n` +
    `🏆 Resultado:\n**${escolha}**`
  );

      return msg.reply({ embeds: [embed] });
    }
  });
}
