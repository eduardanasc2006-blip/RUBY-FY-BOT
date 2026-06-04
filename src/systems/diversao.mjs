import { EmbedBuilder } from 'discord.js';
import { ganharXP, gastarXP } from './xpSystem.mjs';

/* =========================
   DADO (PvP opcional)
========================= */
if (cmd === 'dado') {
  const faces = parseInt(args[0]) || 6;
  const alvo = msg.mentions.users.first();

  const rollUser = Math.floor(Math.random() * faces) + 1;
  const rollAlvo = alvo ? Math.floor(Math.random() * faces) + 1 : null;

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('🎲 Jogo do Dado')
    .addFields(
      { name: msg.author.username, value: `🎲 ${rollUser}`, inline: true }
    );

  if (alvo) {
    const vencedor =
      rollUser > rollAlvo ? msg.author :
      rollUser < rollAlvo ? alvo :
      null;

    embed.addFields(
      { name: alvo.username, value: `🎲 ${rollAlvo}`, inline: true },
      {
        name: '🏆 Resultado',
        value: vencedor ? `${vencedor} venceu!` : '🤝 Empate!'
      }
    );
  }

  return msg.reply({ embeds: [embed] });
}

/* =========================
   COINFLIP (PvP + XP aposta)
========================= */
if (cmd === 'coinflip') {
  const escolha = args[0]?.toLowerCase();
  const alvo = msg.mentions.users.first();
  const aposta = parseInt(args[1]) || 0;

  if (!['cara', 'coroa'].includes(escolha)) {
    return msg.reply('Use: `!coinflip cara/coroa @alguém [XP opcional]`');
  }

  const resultado = Math.random() < 0.5 ? 'cara' : 'coroa';

  let vencedor = null;

  if (escolha === resultado) {
    vencedor = msg.author;
  } else if (alvo) {
    vencedor = alvo;
  }

  // XP aposta
  if (aposta > 0) {
    const ok = await gastarXP(msg.author.id, msg.guild.id, aposta, 'coinflip');
    if (!ok) return msg.reply('❌ XP insuficiente para aposta!');

    if (vencedor) {
      await ganharXP(vencedor.id, msg.guild.id, aposta * 2, 'coinflip');
    }
  }

  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle('🪙 Coinflip')
    .addFields(
      { name: 'Escolha', value: escolha, inline: true },
      { name: 'Resultado', value: resultado, inline: true },
      { name: '🏆 Vencedor', value: vencedor ? `${vencedor}` : 'Ninguém' }
    );

  return msg.reply({ embeds: [embed] });
}

/* =========================
   PEDRA PAPEL TESOURA (PvP + XP aposta)
========================= */
if (cmd === 'ppt') {
  const alvo = msg.mentions.users.first();
  const escolha = args[0]?.toLowerCase();
  const aposta = parseInt(args[1]) || 0;

  const opcoes = ['pedra', 'papel', 'tesoura'];

  if (!opcoes.includes(escolha)) {
    return msg.reply('Use: `!ppt pedra/papel/tesoura @alguém [XP]`');
  }

  const bot = opcoes[Math.floor(Math.random() * opcoes.length)];

  let resultado = 'empate';

  if (
    (escolha === 'pedra' && bot === 'tesoura') ||
    (escolha === 'papel' && bot === 'pedra') ||
    (escolha === 'tesoura' && bot === 'papel')
  ) {
    resultado = 'user';
  } else if (escolha !== bot) {
    resultado = 'bot';
  }

  // XP aposta
  if (aposta > 0) {
    const ok = await gastarXP(msg.author.id, msg.guild.id, aposta, 'ppt');
    if (!ok) return msg.reply('❌ XP insuficiente!');

    if (resultado === 'user') {
      await ganharXP(msg.author.id, msg.guild.id, aposta * 2, 'ppt');
    }
  }

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('✊ Pedra Papel Tesoura')
    .addFields(
      { name: 'Você', value: escolha, inline: true },
      { name: 'Bot', value: bot, inline: true },
      {
        name: 'Resultado',
        value:
          resultado === 'user'
            ? '🏆 Você venceu!'
            : resultado === 'bot'
            ? '😢 Você perdeu!'
            : '🤝 Empate!'
      }
    );

  return msg.reply({ embeds: [embed] });
}

/* =========================
   VERDADE / DESAFIO (XP leve)
========================= */

const VERDADES = [
  'Qual foi a coisa mais estranha que você já comeu?',
  'Qual é o seu maior medo?',
  'Você já mentiu para alguém?',
  'Qual foi seu maior arrependimento?'
];

const DESAFIOS = [
  'Cante algo no chat de voz!',
  'Escreva um poema curto agora!',
  'Fale algo engraçado!',
  'Mande uma mensagem aleatória para alguém!'
];

if (cmd === 'verdade' || cmd === 'desafio') {
  const lista = cmd === 'verdade' ? VERDADES : DESAFIOS;
  const item = lista[Math.floor(Math.random() * lista.length)];

  const xpBonus = Math.floor(Math.random() * 40) + 10;

  await ganharXP(msg.author.id, msg.guild.id, xpBonus, cmd);

  const embed = new EmbedBuilder()
    .setColor(cmd === 'verdade' ? 0x2ecc71 : 0xe74c3c)
    .setTitle(cmd === 'verdade' ? '💬 Verdade' : '🎯 Desafio')
    .setDescription(item)
    .addFields({
      name: '🎁 Recompensa',
      value: `+${xpBonus} XP`
    });

  return msg.reply({ embeds: [embed] });
}
