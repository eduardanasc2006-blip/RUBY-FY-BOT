import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';

import Casamento from '../db/models/Casamento.mjs';
import Afinidade from '../db/models/Afinidade.mjs';
import Usuario from '../db/models/Usuario.mjs';

import { embedErro } from '../utils/embeds.mjs';
import { registrarLog } from '../utils/logger.mjs';
import { nivelAfinidade } from '../utils/nivelCalc.mjs';

const pedidosCasamento = new Map();
const pedidosDivorcio = new Map();

const XP_CASAMENTO = 12000;

/* =========================
   FUNÇÃO NIVEL CASAL
========================= */
function calcularNivelCasal(xp) {
  return Math.floor(Math.sqrt(xp / 1000)) + 1;
}

/* =========================
   COMANDOS
========================= */

export const comandos = [
  { cmd: '!casar @user', desc: 'Pedido de casamento.' },
  { cmd: '!divorciar', desc: 'Pedido de divórcio.' },
  { cmd: '!parceiro', desc: 'Ver parceiro atual.' },
  { cmd: '!topcasais', desc: 'Ranking de casais do servidor.' },
];

export function register(client, configs) {
    if (client.__relacionamentosRegistrado) return;
    client.__relacionamentosRegistrado = true;
  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';

    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    const guildId = msg.guild.id;
    const userId = msg.author.id;

    /* =========================
       CASAR
    ========================= */
    if (cmd === 'casar') {
      const alvo = msg.mentions.users.first();

      if (!alvo || alvo.bot || alvo.id === userId)
        return msg.reply({ embeds: [embedErro('Usuário inválido.')] });

      const jaCasado = await Casamento.findOne({
        guildId,
        ativo: true,
        $or: [{ userId1: userId }, { userId2: userId }]
      });

      if (jaCasado)
        return msg.reply({ embeds: [embedErro('Você já está casado.')] });

      const alvoCasado = await Casamento.findOne({
        guildId,
        ativo: true,
        $or: [{ userId1: alvo.id }, { userId2: alvo.id }]
      });

      if (alvoCasado)
        return msg.reply({ embeds: [embedErro('Essa pessoa já está casada.')] });

      const chave = `${guildId}:${alvo.id}`;

      pedidosCasamento.set(chave, { de: userId, para: alvo.id });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`casar:aceitar:${userId}:${alvo.id}`)
          .setLabel('💍 Aceitar')
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`casar:recusar:${userId}:${alvo.id}`)
          .setLabel('❌ Recusar')
          .setStyle(ButtonStyle.Danger)
      );

      return msg.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff69b4)
            .setTitle('💍 Pedido de Casamento')
            .setDescription(`<@${userId}> pediu <@${alvo.id}> em casamento!`)
        ],
        components: [row]
      });
    }

    /* =========================
       PARCEIRO
    ========================= */
    if (cmd === 'parceiro') {
      const alvo = msg.mentions.users.first() || msg.author;

      const casamento = await Casamento.findOne({
        guildId,
        ativo: true,
        $or: [{ userId1: alvo.id }, { userId2: alvo.id }]
      });

      if (!casamento)
        return msg.reply({ embeds: [embedErro('Você não está casado.')] });

      const parceiro =
        casamento.userId1 === alvo.id
          ? casamento.userId2
          : casamento.userId1;

      const dias = Math.floor(
        (Date.now() - casamento.dataCasamento) / 86400000
      );

      const afin = await Afinidade.findOne({
        guildId,
        userId1: [alvo.id, parceiro].sort()[0],
        userId2: [alvo.id, parceiro].sort()[1]
      });

      return msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff69b4)
            .setTitle('💍 Casal')
            .addFields(
              { name: '💑 Parceiro', value: `<@${parceiro}>`, inline: true },
              { name: '📅 Dias juntos', value: `${dias}`, inline: true },
              {
                name: '💘 Afinidade',
                value: `${afin?.pontos || 0} (${nivelAfinidade(afin?.pontos || 0)})`,
                inline: true
              },
              {
                name: '💖 XP do Casal',
                value: `${casamento.xpCasal || 0}`,
                inline: true
              },
              {
                name: '📊 Nível do Casal',
                value: `${casamento.nivelCasal || 1}`,
                inline: true
              }
            )
        ]
      });
    }

    /* =========================
       TOP CASAIS (CORRIGIDO + XP)
    ========================= */
    if (cmd === 'topcasais') {
      const casais = await Casamento.find({ guildId, ativo: true });

      if (!casais.length)
        return msg.reply({ embeds: [embedErro('Nenhum casal encontrado.')] });

      const lista = casais
        .sort((a, b) => (b.xpCasal || 0) - (a.xpCasal || 0))
        .slice(0, 10)
        .map((c, i) => {
          const nivel = calcularNivelCasal(c.xpCasal || 0);
          return `**${i + 1}.** <@${c.userId1}> ❤️ <@${c.userId2}> — 💖 ${c.xpCasal || 0} XP (Lv ${nivel})`;
        });

      return msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff69b4)
            .setTitle('🏆 Top Casais')
            .setDescription(lista.join('\n'))
        ]
      });
    }

    /* =========================
       DIVÓRCIO
    ========================= */
    if (cmd === 'divorciar') {
      const casamento = await Casamento.findOne({
        guildId,
        ativo: true,
        $or: [{ userId1: userId }, { userId2: userId }]
      });

      if (!casamento)
        return msg.reply({ embeds: [embedErro('Você não está casado.')] });

      const parceiro =
        casamento.userId1 === userId
          ? casamento.userId2
          : casamento.userId1;

      const chave = `${guildId}:${userId}`;

      pedidosDivorcio.set(chave, {
        casamentoId: casamento._id,
        parceiro
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`div:aceitar:${userId}`)
          .setLabel('💔 Aceitar')
          .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
          .setCustomId(`div:recusar:${userId}`)
          .setLabel('❌ Recusar')
          .setStyle(ButtonStyle.Secondary)
      );

      return msg.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x888888)
            .setTitle('💔 Pedido de Divórcio')
            .setDescription(`<@${userId}> quer se divorciar de <@${parceiro}>`)
        ],
        components: [row]
      });
    }
  });

  /* =========================
     INTERACTIONS
  ========================= */
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const { customId, guild, user } = interaction;

    /* =========================
       CASAMENTO
    ========================= */
    if (customId.startsWith('casar:')) {
      const [, acao, deId, paraId] = customId.split(':');

      if (user.id !== paraId)
        return interaction.reply({ content: 'Não é para você.', flags: 64 });

      const chave = `${guild.id}:${paraId}`;
      const pedido = pedidosCasamento.get(chave);

      if (!pedido)
        return interaction.reply({ content: 'Pedido expirado.', flags: 64 });

      if (acao === 'aceitar') {
        const xpInicial = 100;

        await Casamento.create({
          guildId: guild.id,
          userId1: deId,
          userId2: paraId,
          dataCasamento: new Date(),
          ativo: true,
          xpCasal: xpInicial,
          nivelCasal: calcularNivelCasal(xpInicial)
        });

        pedidosCasamento.delete(chave);

        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0xff69b4)
              .setTitle('💍 Casamento realizado!')
              .setDescription(`<@${deId}> ❤️ <@${paraId}>`)
          ],
          components: []
        });
      }

      pedidosCasamento.delete(chave);
    }

    /* =========================
       DIVÓRCIO
    ========================= */
    if (customId.startsWith('div:')) {
      const [, acao, userId] = customId.split(':');

      const chave = `${guild.id}:${userId}`;
      const pedido = pedidosDivorcio.get(chave);

      if (!pedido)
        return interaction.reply({ content: 'Pedido expirado.', flags: 64 });

      if (user.id !== pedido.parceiro && user.id !== userId)
        return interaction.reply({ content: 'Não é para você.', flags: 64 });

      if (acao === 'aceitar') {
        await Casamento.findByIdAndUpdate(pedido.casamentoId, {
          ativo: false,
          dataFim: new Date()
        });

        pedidosDivorcio.delete(chave);

        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x888888)
              .setTitle('💔 Divórcio realizado')
              .setDescription('O casamento foi encerrado.')
          ],
          components: []
        });
      }

      pedidosDivorcio.delete(chave);
    }
  });
}
