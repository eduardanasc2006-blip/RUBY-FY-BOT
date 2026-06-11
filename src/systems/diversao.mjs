import {
    EmbedBuilder
  } from 'discord.js';
  import {
    transferirXP,
    temXP
  } from './xpSystem.mjs';

  /* =========================
     COMANDOS EXPORTADOS
  ========================= */

  export const comandos = [
    { cmd: '!8ball <pergunta>', desc: 'Bola mágica 8 — responde sua pergunta.' },
    { cmd: '!dado [faces]', desc: 'Rola um dado (padrão 6 faces).' },
   { cmd: '!coinflip bot <cara/coroa> <xp>', desc: 'Aposte XP contra o bot.' },
{ cmd: '!coinflip @usuario <xp>', desc: 'Desafie alguém no cara ou coroa.' },
{ cmd: '!ppt bot <xp>', desc: 'PPT contra o bot valendo XP.' },
{ cmd: '!ppt @usuario <xp>', desc: 'PPT contra outro usuário.' },
{ cmd: '!meme', desc: 'Meme aleatório.' },
    { cmd: '!roleta', desc: 'Sorteia um membro aleatório online.' },
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

  const MIN_APOSTA = 10;
  const MAX_APOSTA = 5000;

  /* =========================
     REGISTER
  ========================= */

  export function register(client, configs) {
  if (client.__diversaoRegistrado) return;
  client.__diversaoRegistrado = true;
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
        const embed = new EmbedBuilder()
.setColor(0x3498db)
.setTitle('🎲 Rolagem de Dado')
.setDescription(
`🎯 Faces: **${faces}**

🎲 Resultado:
# ${r}`
);

return msg.reply({ embeds: [embed] });
      }

      /* =========================
         COINFLIP
      ========================= */

      if (cmd === 'coinflip') {
        return msg.reply(Math.random() < 0.5 ? '🪙 Cara' : '🪙 Coroa');
      }

      /* =========================
         PPT (PvP + XP)
         — usa transferirXP() para não inflar o xpTotal
      ========================= */

      if (cmd === 'ppt') {
        const alvo = msg.mentions.users.first();

        if (!alvo) {
          return msg.reply('❌ Use: `!ppt @usuario [xp]`');
        }

        if (alvo.id === msg.author.id) {
          return msg.reply('❌ Você não pode jogar contra você mesmo.');
        }

        if (alvo.bot) {
          return msg.reply('❌ Você não pode apostar contra um bot.');
        }

        // ── Parse e validação da aposta ──────────────────────
        const apostaRaw = parseInt(args.find(a => /^\d+$/.test(a))) || 0;

        if (apostaRaw !== 0) {
          if (apostaRaw < MIN_APOSTA) {
            return msg.reply(`❌ A aposta mínima é **${MIN_APOSTA} XP**.`);
          }
          if (apostaRaw > MAX_APOSTA) {
            return msg.reply(`❌ A aposta máxima é **${MAX_APOSTA} XP**.`);
          }
        }

        const aposta = apostaRaw;

        // ── Jogo ─────────────────────────────────────────────
        const opcoes = ['🪨 Pedra', '📄 Papel', '✂️ Tesoura'];
        const escolhaUser = opcoes[Math.floor(Math.random() * opcoes.length)];
        const escolhaAlvo = opcoes[Math.floor(Math.random() * opcoes.length)];

        const ganhou =
          (escolhaUser === '🪨 Pedra'    && escolhaAlvo === '✂️ Tesoura') ||
          (escolhaUser === '📄 Papel'    && escolhaAlvo === '🪨 Pedra')   ||
          (escolhaUser === '✂️ Tesoura' && escolhaAlvo === '📄 Papel');

        const empate = escolhaUser === escolhaAlvo;

        let vencedorId  = null;
        let perdedorId  = null;
        let resultado   = '🤝 Empate!';

        if (!empate) {
          if (ganhou) {
            vencedorId = msg.author.id;
            perdedorId = alvo.id;
            resultado  = `🏆 ${msg.author.username} venceu!`;
          } else {
            vencedorId = alvo.id;
            perdedorId = msg.author.id;
            resultado  = `🏆 ${alvo.username} venceu!`;
          }
        }

        // ── XP: apenas se há aposta e há vencedor ────────────
        let xpMovimentado = false;
        let footerText;
        let movimentacaoField = null;

        if (aposta > 0 && !empate) {
          const authorTemXP = await temXP(msg.author.id, msg.guild.id, aposta);
          const alvoTemXP   = await temXP(alvo.id, msg.guild.id, aposta);

          if (!authorTemXP || !alvoTemXP) {
            return msg.reply(
              `❌ Um dos jogadores não possui XP suficiente ou ainda não possui perfil criado.\n` +
              `Ambos precisam ter pelo menos **${aposta} XP disponível**.`
            );
          }

          xpMovimentado = await transferirXP(
            perdedorId,
            vencedorId,
            msg.guild.id,
            aposta,
            'ppt'
          );

          const nomeVencedor = vencedorId === msg.author.id ? msg.author.username : alvo.username;
          const nomePerdedor = perdedorId === msg.author.id ? msg.author.username : alvo.username;

          footerText = xpMovimentado
            ? `${aposta} XP transferidos`
            : `Aposta: ${aposta} XP (falha na transferência)`;

          movimentacaoField = xpMovimentado
            ? {
                name: '💰 Movimentação de XP',
                value: `📈 ${nomeVencedor} recebeu **+${aposta} XP**\n📉 ${nomePerdedor} perdeu **-${aposta} XP**`,
                inline: false,
              }
            : null;

        } else if (empate && aposta > 0) {
          footerText = 'Empate — nenhum XP transferido';
        } else {
          footerText = 'Partida amistosa';
        }

        // ── Embed ─────────────────────────────────────────────
        const embed = new EmbedBuilder()
          .setColor(empate ? 0x95a5a6 : ganhou ? 0x2ecc71 : 0xe74c3c)
          .setTitle('⚔️ Duelo — Pedra, Papel ou Tesoura')
          .addFields(
            { name: `👤 ${msg.author.username}`, value: escolhaUser, inline: true },
            { name: `👤 ${alvo.username}`,        value: escolhaAlvo, inline: true },
            { name: '🏆 Resultado', value: resultado, inline: false }
          )
          .setFooter({ text: footerText });

        if (movimentacaoField) embed.addFields(movimentacaoField);

        return msg.reply({ embeds: [embed] });
      }

      /* =========================
         ROLETA
      ========================= */

      if (cmd === 'roleta') {
        const membros = msg.guild.members.cache
          .filter(m => !m.user.bot && m.presence?.status !== 'offline');

        const arr = [...(membros.size ? membros : msg.guild.members.cache.filter(m => !m.user.bot)).values()];

        if (!arr.length) return msg.reply('❌ Nenhum membro encontrado.');

        const escolhido = arr[Math.floor(Math.random() * arr.length)];

        const embed = new EmbedBuilder()
            .setImage('https://media.tenor.com/uK95REraK8AAAAAC/roulette-wheel.gif')
          .setColor(0xf1c40f)
          .setTitle('🎰 Roleta da Sorte')
          .setDescription(
            `🎲 Girando a roleta...\n\n` +
            `👥 Participantes: ${arr.length}\n\n` +
            `🏆 Sorteado:\n**${escolhido.displayName}**\n\n✨ Parabéns!`
          );

        return msg.reply({ embeds: [embed] });
      }

    });
  }
  
