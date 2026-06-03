import { EmbedBuilder } from 'discord.js';

const RESPOSTAS_8BALL = [
  '✅ Sim, definitivamente!', '✅ Com certeza!', '✅ Tudo indica que sim.',
  '✅ Provavelmente sim.', '🤔 Difícil dizer...', '🤔 Pergunta de novo mais tarde.',
  '🤔 Não tenho certeza.', '❌ Provavelmente não.', '❌ Não parece.', '❌ Definitivamente não.',
];

const VERDADES = [
  'Qual foi a coisa mais estranha que você já comeu?',
  'Qual é o seu maior medo?',
  'Você já mentiu para um amigo? O que foi?',
  'Qual é a coisa mais engraçada que aconteceu com você?',
  'Se você pudesse ser qualquer animal, qual seria?',
  'Qual é seu maior arrependimento?',
  'Você já apagou uma mensagem por vergonha?',
  'O que você faria com R$1 milhão?',
];

const DESAFIOS = [
  'Escreva um poema de 4 versos agora!',
  'Fale em inglês por 5 minutos.',
  'Envie uma foto fazendo pose engraçada.',
  'Cante uma música no chat de voz.',
  'Escreva seu nome com a mão não dominante.',
  'Conte até 20 em outra língua.',
  'Tente dar 3 coisas positivas sobre você.',
  'Mande uma mensagem aleatória para o próximo contato.',
];

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    if (cmd === '8ball') {
      const pergunta = args.join(' ');
      if (!pergunta) return msg.reply('❓ Faça uma pergunta! Ex: `!8ball Vou passar na prova?`');
      const resp = RESPOSTAS_8BALL[Math.floor(Math.random() * RESPOSTAS_8BALL.length)];
      const embed = new EmbedBuilder().setColor(0x9b59b6)
        .setTitle('🎱 Bola Mágica 8')
        .addFields({ name: '❓ Pergunta', value: pergunta }, { name: '💬 Resposta', value: resp })
        .setTimestamp();
      return msg.reply({ embeds: [embed] });
    }

    if (cmd === 'dado') {
      const faces = parseInt(args[0]) || 6;
      const resultado = Math.floor(Math.random() * faces) + 1;
      return msg.reply(`🎲 Você rolou um dado de **${faces}** faces: **${resultado}**`);
    }

    if (cmd === 'coinflip') {
      const r = Math.random() < 0.5 ? '🪙 Cara!' : '🪙 Coroa!';
      return msg.reply(r);
    }

    if (cmd === 'ppt') {
      const opcoes = ['🪨 Pedra', '📄 Papel', '✂️ Tesoura'];
      const bot = opcoes[Math.floor(Math.random() * opcoes.length)];
      const user = opcoes[Math.floor(Math.random() * opcoes.length)];
      let resultado = '🤝 Empate!';
      if (
        (user === opcoes[0] && bot === opcoes[2]) ||
        (user === opcoes[1] && bot === opcoes[0]) ||
        (user === opcoes[2] && bot === opcoes[1])
      ) resultado = '🏆 Você ganhou!';
      else if (user !== bot) resultado = '😢 Bot ganhou!';
      const embed = new EmbedBuilder().setColor(0x3498db)
        .setTitle('✊ Pedra, Papel ou Tesoura')
        .addFields({ name: '🧑 Você', value: user, inline: true }, { name: '🤖 Bot', value: bot, inline: true }, { name: '📊 Resultado', value: resultado, inline: false })
        .setTimestamp();
      return msg.reply({ embeds: [embed] });
    }

    if (cmd === 'roleta') {
      const membros = msg.guild.members.cache.filter(m => !m.user.bot);
      if (!membros.size) return msg.reply('Nenhum membro encontrado.');
      const arr = [...membros.values()];
      const escolhido = arr[Math.floor(Math.random() * arr.length)];
      return msg.reply(`🎰 A roleta escolheu: **${escolhido.displayName}** (${escolhido.toString()})`);
    }

    if (cmd === 'escolher') {
      if (!args.length) return msg.reply('Use: `!escolher opção1 opção2 opção3`');
      const escolha = args[Math.floor(Math.random() * args.length)];
      return msg.reply(`🎯 Eu escolho: **${escolha}**!`);
    }

    if (cmd === 'sortear') {
      const membros = msg.guild.members.cache.filter(m => !m.user.bot && m.presence?.status !== 'offline');
      const arr = [...(membros.size > 0 ? membros : msg.guild.members.cache.filter(m => !m.user.bot)).values()];
      if (!arr.length) return msg.reply('Nenhum membro para sortear.');
      const escolhido = arr[Math.floor(Math.random() * arr.length)];
      return msg.reply(`🎉 Sorteado: **${escolhido.displayName}**!`);
    }

    if (cmd === 'verdade') {
      const v = VERDADES[Math.floor(Math.random() * VERDADES.length)];
      const embed = new EmbedBuilder().setColor(0x2ecc71).setTitle('💬 Verdade').setDescription(v).setTimestamp();
      return msg.reply({ embeds: [embed] });
    }

    if (cmd === 'desafio') {
      const d = DESAFIOS[Math.floor(Math.random() * DESAFIOS.length)];
      const embed = new EmbedBuilder().setColor(0xe74c3c).setTitle('🎯 Desafio').setDescription(d).setTimestamp();
      return msg.reply({ embeds: [embed] });
    }
  });
}
