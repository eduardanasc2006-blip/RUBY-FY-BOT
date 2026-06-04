import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

import { ganharXP, gastarXP } from './xpSystem.mjs';

const duelosAtivos = new Map();

/* =========================
   !duel @usuario valor
========================= */
export async function handleDuel(msg, args) {
  const desafiante = msg.author;
  const oponente = msg.mentions.users.first();
  const aposta = parseInt(args[1]) || 0;

  if (!oponente) {
    return msg.reply('❌ Use: `!duel @usuario [XP opcional]`');
  }

  if (oponente.bot) {
    return msg.reply('❌ Você não pode duelar com bots.');
  }

  const chave = `${msg.guild.id}:${oponente.id}`;

  if (duelosAtivos.has(chave)) {
    return msg.reply('⚠️ Esse jogador já está em um duelo pendente.');
  }

  /* trava duelo */
  duelosAtivos.set(chave, {
    desafiante: desafiante.id,
    oponente: oponente.id,
    aposta,
    channel: msg.channel.id,
    timeout: null,
  });

  /* embed convite */
  const embed = new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle('⚔️ Pedido de Duelo!')
    .setDescription(
      `<@${oponente.id}>, você foi desafiado por <@${desafiante.id}>!\n\n💰 Aposta: **${aposta > 0 ? aposta + ' XP' : 'Sem aposta'}**`
    )
    .setFooter({ text: 'Você tem 30 segundos para responder' });

  /* botões */
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`duel_accept:${desafiante.id}:${oponente.id}:${aposta}`)
      .setLabel('Aceitar')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`duel_reject:${desafiante.id}:${oponente.id}`)
      .setLabel('Recusar')
      .setStyle(ButtonStyle.Danger)
  );

  const msgDuelo = await msg.reply({
    embeds: [embed],
    components: [row],
  });

  /* timeout automático */
  const timeout = setTimeout(async () => {
    if (!duelosAtivos.has(chave)) return;

    duelosAtivos.delete(chave);

    await msgDuelo.edit({
      components: [],
      embeds: [
        new EmbedBuilder()
          .setColor(0x95a5a6)
          .setTitle('⏱️ Duelo cancelado')
          .setDescription('O tempo expirou e ninguém respondeu.'),
      ],
    });
  }, 30_000);

  duelosAtivos.get(chave).timeout = timeout;
}

/* =========================
   INTERAÇÕES DO DUEL
========================= */
export async function handleDuelInteraction(interaction) {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith('duel_')) return;

  const [action, desafianteId, oponenteId, apostaStr] =
    interaction.customId.split(':');

  const aposta = parseInt(apostaStr) || 0;
  const guildId = interaction.guild.id;

  const chave = `${guildId}:${oponenteId}`;
  const duelo = duelosAtivos.get(chave);

  if (!duelo) {
    return interaction.reply({
      content: '❌ Esse duelo não existe mais.',
      ephemeral: true,
    });
  }

  /* só o oponente pode responder */
  if (interaction.user.id !== oponenteId) {
    return interaction.reply({
      content: '❌ Esse duelo não é seu.',
      ephemeral: true,
    });
  }

  clearTimeout(duelo.timeout);
  duelosAtivos.delete(chave);

  /* =========================
     RECUSAR
  ========================= */
  if (action === 'duel_reject') {
    return interaction.update({
      components: [],
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle('❌ Duelo recusado')
          .setDescription(`<@${oponenteId}> recusou o duelo.`),
      ],
    });
  }

  /* =========================
     ACEITAR → RESOLVER
  ========================= */

  const desafianteRoll = Math.floor(Math.random() * 100) + 1;
  const oponenteRoll = Math.floor(Math.random() * 100) + 1;

  let vencedor = null;

  if (desafianteRoll > oponenteRoll) {
    vencedor = desafianteId;
  } else if (oponenteRoll > desafianteRoll) {
    vencedor = oponenteId;
  }

  /* =========================
     APOSTA XP
  ========================= */
  if (aposta > 0) {
    const ok1 = await gastarXP(desafianteId, guildId, aposta, 'duel');
    const ok2 = await gastarXP(oponenteId, guildId, aposta, 'duel');

    if (ok1 && ok2 && vencedor) {
      await ganharXP(vencedor, guildId, aposta * 2, 'duel');
    }
  }

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('⚔️ Resultado do Duelo')
    .addFields(
      {
        name: '🧑 Desafiante',
        value: `<@${desafianteId}> 🎲 ${desafianteRoll}`,
        inline: true,
      },
      {
        name: '🧑 Oponente',
        value: `<@${oponenteId}> 🎲 ${oponenteRoll}`,
        inline: true,
      },
      {
        name: '🏆 Vencedor',
        value: vencedor ? `<@${vencedor}>` : 'Empate!',
        inline: false,
      }
    );

  return interaction.update({
    embeds: [embed],
    components: [],
  });
                                  }
