import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
  import {
  transferirXP,
  temXP,
  ganharXP,
  gastarXP
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
    client.on('interactionCreate', async (interaction) => {

  if (!interaction.isButton()) return;

  if (!interaction.customId.startsWith('ppt_')) return;

  const [, escolha, apostaStr] =
    interaction.customId.split('_');

  const aposta = parseInt(apostaStr);

  const mapa = {
    pedra: '🪨 Pedra',
    papel: '📄 Papel',
    tesoura: '✂️ Tesoura'
  };

  const escolhaUser = mapa[escolha];

  const opcoes = [
    '🪨 Pedra',
    '📄 Papel',
    '✂️ Tesoura'
  ];

  const escolhaBot =
    opcoes[Math.floor(Math.random() * opcoes.length)];

  const empate =
    escolhaUser === escolhaBot;

  const venceu =
    (escolhaUser === '🪨 Pedra' && escolhaBot === '✂️ Tesoura') ||
    (escolhaUser === '📄 Papel' && escolhaBot === '🪨 Pedra') ||
    (escolhaUser === '✂️ Tesoura' && escolhaBot === '📄 Papel');

  if (!empate) {

    if (venceu) {

      await ganharXP(
        interaction.user.id,
        interaction.guild.id,
        aposta,
        'ppt_bot'
      );

    } else {

      await gastarXP(
        interaction.user.id,
        interaction.guild.id,
        aposta,
        'ppt_bot'
      );
    }
  }

  const resultado = new EmbedBuilder()
    .setColor(
      empate
        ? 0x95a5a6
        : venceu
        ? 0x2ecc71
        : 0xe74c3c
    )
    .setTitle('🤖 Pedra, Papel ou Tesoura')
    .addFields(
      {
        name: '👤 Você',
        value: escolhaUser,
        inline: true
      },
      {
        name: '🤖 FiskBot',
        value: escolhaBot,
        inline: true
      },
      {
        name: '🏆 Resultado',
        value:
          empate
            ? '🤝 Empate! Nenhum XP foi movimentado.'
            : venceu
            ? `🎉 Você ganhou **${aposta} XP**`
            : `💀 Você perdeu **${aposta} XP**`,
        inline: false
      }
    )
    .setFooter({
      text: `Aposta: ${aposta} XP`
    });

  return interaction.update({
    embeds: [resultado],
    components: []
  });
      });
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

  if (faces < 2 || faces > 1000) {
    return msg.reply('❌ Escolha entre 2 e 1000 faces.');
  }

  const r = Math.floor(Math.random() * faces) + 1;

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('🎲 Dado RPG')
    .setDescription(
      `🎯 Faces: **${faces}**\n\n` +
      `🎲 Resultado: **${r}**`
    );

  return msg.reply({ embeds: [embed] });
}
 /* =========================
   COINFLIP
========================= */
if (cmd === 'coinflip') {

  const alvo = msg.mentions.users.first();

  // PvP
  if (alvo) {

    if (alvo.id === msg.author.id) {
      return msg.reply('❌ Você não pode apostar contra si mesmo.');
    }

    if (alvo.bot) {
      return msg.reply('❌ Você não pode apostar contra bots.');
    }

    const aposta = parseInt(
      args.find(a => /^\d+$/.test(a))
    );

    if (!aposta) {
      return msg.reply(
        '❌ Use: !coinflip @usuario <xp>'
      );
    }

    if (!(await temXP(msg.author.id, msg.guild.id, aposta))) {
      return msg.reply('❌ Você não tem XP suficiente.');
    }

    if (!(await temXP(alvo.id, msg.guild.id, aposta))) {
      return msg.reply('❌ O adversário não tem XP suficiente.');
    }

    const vencedor =
      Math.random() < 0.5
        ? msg.author
        : alvo;

    const perdedor =
      vencedor.id === msg.author.id
        ? alvo
        : msg.author;

    await transferirXP(
      perdedor.id,
      vencedor.id,
      msg.guild.id,
      aposta,
      'coinflip'
    );

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('🪙 Coinflip PvP')
      .setDescription(
`🎟️ Cada jogador apostou **${aposta} XP**
🏦 Pote total: **${aposta * 2} XP**

🏆 Vencedor: **${vencedor.username}**
🎰 Hoje a moeda caiu exatamente do seu lado!`
      );

    return msg.reply({ embeds: [embed] });
  }

  // Contra BOT
  if (args[0]?.toLowerCase() === 'bot') {

    const escolha = args[1]?.toLowerCase();
    const aposta = parseInt(args[2]);

    if (!['cara', 'coroa'].includes(escolha)) {
      return msg.reply(
        '❌ Use: !coinflip bot <cara/coroa> <xp>'
      );
    }

    if (!aposta || aposta < MIN_APOSTA || aposta > MAX_APOSTA) {
      return msg.reply(
        `❌ A aposta deve ser entre ${MIN_APOSTA} e ${MAX_APOSTA} XP.`
      );
    }

    if (!(await temXP(msg.author.id, msg.guild.id, aposta))) {
      return msg.reply(
        `❌ Você não possui ${aposta} XP disponível.`
      );
    }

    // BOT MAIS FRACO (40% chance de ganhar só)
const resultado =
  Math.random() < 0.6
    ? escolha
    : escolha === 'cara' ? 'coroa' : 'cara';

    const venceu = resultado === escolha;

    if (venceu) {
      await ganharXP(
        msg.author.id,
        msg.guild.id,
        aposta,
        'coinflip_bot'
      );
    } else {
      await gastarXP(
        msg.author.id,
        msg.guild.id,
        aposta,
        'coinflip_bot'
      );
    }

    return msg.reply(
      `🪙 Caiu **${resultado}**!\n\n` +
      (venceu
        ? `🎉 Você ganhou ${aposta} XP!`
        : `💀 Você perdeu ${aposta} XP!`)
    );
  }

  return msg.reply(
    '❌ Use:\n!coinflip bot cara 500\n!coinflip @usuario 500'
  );
  }

     

 
       /* =========================
   PPT (BOT + PvP)
========================= */

if (cmd === 'ppt') {

  // ================= BOT =================

  if (args[0]?.toLowerCase() === 'bot') {

  const aposta = parseInt(args[1]);

  if (!aposta || aposta < MIN_APOSTA || aposta > MAX_APOSTA) {
    return msg.reply(
      `❌ A aposta deve ser entre ${MIN_APOSTA} e ${MAX_APOSTA} XP.`
    );
  }

  if (!(await temXP(msg.author.id, msg.guild.id, aposta))) {
    return msg.reply(
      `❌ Você não possui ${aposta} XP disponível.`
    );
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🎮 Pedra, Papel ou Tesoura')
    .setDescription(
      `💰 Aposta: **${aposta} XP**\n\n` +
      `Escolha sua jogada abaixo:`
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ppt_pedra_${aposta}`)
      .setLabel('Pedra')
      .setEmoji('🪨')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`ppt_papel_${aposta}`)
      .setLabel('Papel')
      .setEmoji('📄')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId(`ppt_tesoura_${aposta}`)
      .setLabel('Tesoura')
      .setEmoji('✂️')
      .setStyle(ButtonStyle.Success)
  );

  return msg.reply({
    embeds: [embed],
    components: [row]
  });
}
  // ================= PvP =================

  const alvo = msg.mentions.users.first();

  if (!alvo) {
    return msg.reply(
      '❌ Use:\n!ppt bot 100\n!ppt @usuario 100'
    );
  }

  if (alvo.id === msg.author.id) {
    return msg.reply(
      '❌ Você não pode jogar contra você mesmo.'
    );
  }

  if (alvo.bot) {
    return msg.reply(
      '❌ Você não pode apostar contra um bot.'
    );
  }

  const aposta = parseInt(
    args.find(a => /^\d+$/.test(a))
  ) || 0;

  if (aposta > 0) {

    if (aposta < MIN_APOSTA) {
      return msg.reply(
        `❌ A aposta mínima é **${MIN_APOSTA} XP**.`
      );
    }

    if (aposta > MAX_APOSTA) {
      return msg.reply(
        `❌ A aposta máxima é **${MAX_APOSTA} XP**.`
      );
    }

    const autorTemXP = await temXP(
      msg.author.id,
      msg.guild.id,
      aposta
    );

    const alvoTemXP = await temXP(
      alvo.id,
      msg.guild.id,
      aposta
    );

    if (!autorTemXP || !alvoTemXP) {
      return msg.reply(
        `❌ Um dos jogadores não possui **${aposta} XP** disponíveis.`
      );
    }
  }

  const opcoes = [
    '🪨 Pedra',
    '📄 Papel',
    '✂️ Tesoura'
  ];

  const escolhaAutor =
    opcoes[Math.floor(Math.random() * opcoes.length)];

  const escolhaAlvo =
    opcoes[Math.floor(Math.random() * opcoes.length)];

  const empate =
    escolhaAutor === escolhaAlvo;

  const autorVenceu =
    (escolhaAutor === '🪨 Pedra' && escolhaAlvo === '✂️ Tesoura') ||
    (escolhaAutor === '📄 Papel' && escolhaAlvo === '🪨 Pedra') ||
    (escolhaAutor === '✂️ Tesoura' && escolhaAlvo === '📄 Papel');

  let resultado;
  let footer = 'Partida amistosa';
  let campoXP = null;

  if (empate) {

    resultado = '🤝 Empate!';

    if (aposta > 0) {
      footer = 'Empate — nenhum XP transferido';
    }

  } else {

    const vencedor = autorVenceu
      ? msg.author
      : alvo;

    const perdedor = autorVenceu
      ? alvo
      : msg.author;

    resultado =
      `🏆 ${vencedor.username} venceu!`;

    if (aposta > 0) {

      await transferirXP(
        perdedor.id,
        vencedor.id,
        msg.guild.id,
        aposta,
        'ppt'
      );

      footer =
        `${aposta} XP transferidos`;

      campoXP = {
        name: '💰 Movimentação de XP',
        value:
          `📈 ${vencedor.username}: +${aposta} XP\n` +
          `📉 ${perdedor.username}: -${aposta} XP`,
        inline: false
      };
    }
  }

  const embed = new EmbedBuilder()
    .setColor(
      empate
        ? 0x95a5a6
        : autorVenceu
        ? 0x2ecc71
        : 0xe74c3c
    )
    .setTitle('⚔️ Pedra, Papel ou Tesoura')
    .addFields(
      {
        name: `👤 ${msg.author.username}`,
        value: escolhaAutor,
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
    .setFooter({ text: footer });

  if (campoXP) {
    embed.addFields(campoXP);
  }

  return msg.reply({
    embeds: [embed]
  });
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
        .setImage('https://media.tenor.com/0JZf5Q8xXx0AAAAC/roulette.gif')
          .setColor(0xf1c40f)
          .setTitle('🎰 Roleta da Sorte')
          .setDescription(
            `🎲 Girando a roleta...\n\n` +
            `👥 Participantes: ${arr.length}\n\n` +
            `🏆 Sorteado:\n**${escolhido.displayName}**\n\n✨ Parabéns!`
          );

        return msg.reply({ embeds: [embed] });
      }

        /* =========================
   MEME
========================= */

if (cmd === 'meme') {

  const memes = [
    'https://i.imgflip.com/30b1gx.jpg',
    'https://i.imgflip.com/1bij.jpg',
    'https://i.imgflip.com/26am.jpg',
    'https://i.imgflip.com/2fm6x.jpg',
    'https://i.imgflip.com/39t1o.jpg'
  ];

  const frases = [
    '💀 Esse meme escapou do porão da internet.',
    '🔥 Meme recém-saído do forno.',
    '🗿 Os anciões aprovaram este meme.',
    '⚠️ Risco elevado de gargalhadas.',
    '🤣 Seu QI pode diminuir após visualizar.',
    '📡 Capturado diretamente dos confins da web.',
    '🐒 Um macaco treinado escolheu este meme.',
    '✨ Meme lendário desbloqueado.',
    '🎭 Humor de procedência duvidosa.',
    '🚨 Atenção: meme potencialmente perigoso.'
  ];

  const meme =
    memes[Math.floor(Math.random() * memes.length)];

  const frase =
    frases[Math.floor(Math.random() * frases.length)];

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle('😂 Central de Memes do Fisk')
    .setDescription(frase)
    .setImage(meme)
    .setFooter({
      text: `Pedido por ${msg.author.username}`
    })
    .setTimestamp();

  return msg.reply({ embeds: [embed] });
}
        
    });
  }
  
