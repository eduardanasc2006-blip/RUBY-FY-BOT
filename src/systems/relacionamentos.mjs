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

const pedidos = new Map();

/* =========================
   CONFIG
========================= */

const XP_CASAMENTO = 12000;

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

    const guildId = msg.guild.id;
    const userId = msg.author.id;

    /* =========================
       CASAR
    ========================= */

    if (cmd === 'casar') {
      const alvo = msg.mentions.users.first();

      if (!alvo || alvo.bot || alvo.id === userId)
        return msg.reply({ embeds: [embedErro('Usuário inválido.')] });

      const [u1, u2] = await Promise.all([
        Usuario.findOne({ userId, guildId }),
        Usuario.findOne({ userId: alvo.id, guildId })
      ]);

      if ((u1?.xpDisponivel || 0) < XP_CASAMENTO ||
          (u2?.xpDisponivel || 0) < XP_CASAMENTO) {
        return msg.reply({
          embeds: [embedErro(`❌ Ambos precisam de **${XP_CASAMENTO.toLocaleString()} XP disponível**.`)]
        });
      }

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

      if (pedidos.has(chave))
        return msg.reply({ embeds: [embedErro('Já existe um pedido pendente.')] });

      pedidos.set(chave, { de: userId, para: alvo.id });

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

      await msg.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff69b4)
            .setTitle('💍 Pedido de Casamento')
            .setDescription(
              `<@${userId}> pediu <@${alvo.id}> em casamento!\n💰 Custo: **${XP_CASAMENTO.toLocaleString()} XP cada um**`
            )
        ],
        components: [row]
      });

      setTimeout(() => pedidos.delete(chave), 60000);
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
        return msg.reply({ embeds: [embedErro('Sem casamento ativo.')] });

      const parceiro = casamento.userId1 === alvo.id
        ? casamento.userId2
        : casamento.userId1;

      const dias = Math.floor((Date.now() - casamento.dataCasamento) / 86400000);

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
              }
            )
        ]
      });
    }

    /* =========================
       DIVORCIAR (COMANDO)
    ========================= */

    if (cmd === 'divorciar') {
      const casamento = await Casamento.findOne({
        guildId,
        ativo: true,
        $or: [{ userId1: userId }, { userId2: userId }]
      });

      if (!casamento) {
        return msg.reply({
          embeds: [embedErro('💔 Você não está casado.')]
        });
      }

      const parceiro = casamento.userId1 === userId
        ? casamento.userId2
        : casamento.userId1;

      const chave = `div:${guildId}:${userId}`;

      if (pedidos.has(chave)) {
        return msg.reply({
          embeds: [embedErro('Já existe um pedido de divórcio pendente.')]
        });
      }

      pedidos.set(chave, {
        casamentoId: casamento._id,
        parceiro
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`div:aceitar:${userId}`)
          .setLabel('💔 Confirmar divórcio')
          .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
          .setCustomId(`div:cancelar:${userId}`)
          .setLabel('💍 Cancelar')
          .setStyle(ButtonStyle.Success)
      );

      return msg.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff5555)
            .setTitle('💔 Pedido de Divórcio')
            .setDescription(
              `<@${userId}> deseja encerrar o casamento com <@${parceiro}>`
            )
        ],
        components: [row]
      });
    }
  });

  /* =========================
     INTERAÇÕES
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
        return interaction.reply({ content: 'Não é para você.', ephemeral: true });

      const chave = `${guild.id}:${paraId}`;

      if (acao === 'aceitar') {
        const u1 = await Usuario.findOne({ userId: deId, guildId: guild.id });
        const u2 = await Usuario.findOne({ userId: paraId, guildId: guild.id });

        if ((u1?.xpDisponivel || 0) < XP_CASAMENTO ||
            (u2?.xpDisponivel || 0) < XP_CASAMENTO) {
          return interaction.reply({ content: 'XP insuficiente.', ephemeral: true });
        }

        const ja = await Casamento.findOne({
          guildId: guild.id,
          ativo: true,
          $or: [
            { userId1: deId },
            { userId2: deId },
            { userId1: paraId },
            { userId2: paraId }
          ]
        });

        if (ja)
          return interaction.reply({ content: 'Um dos usuários já está casado.', ephemeral: true });

        await Usuario.updateOne(
          { userId: deId, guildId: guild.id },
          { $inc: { xpDisponivel: -XP_CASAMENTO } }
        );

        await Usuario.updateOne(
          { userId: paraId, guildId: guild.id },
          { $inc: { xpDisponivel: -XP_CASAMENTO } }
        );

        await Casamento.create({
          guildId: guild.id,
          userId1: deId,
          userId2: paraId,
          dataCasamento: new Date(),
          ativo: true
        });

        await registrarLog(interaction.client, guild.id, 'casamento', deId, {
          descricao: `<@${deId}> e <@${paraId}> casaram (-${XP_CASAMENTO} XP cada)`
        });

        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0xff69b4)
              .setTitle('💍 Casamento realizado!')
              .setDescription(`<@${deId}> ❤️ <@${paraId}>`)
          ],
          components: []
        });
      }

      pedidos.delete(chave);
    }

    /* =========================
       DIVÓRCIO
    ========================= */

    if (customId.startsWith('div:')) {
      const [, acao, deId] = customId.split(':');
      const chave = `div:${guild.id}:${deId}`;

      const data = pedidos.get(chave);
      if (!data)
        return interaction.reply({ content: 'Pedido expirado.', ephemeral: true });

      if (acao === 'aceitar') {
        await Casamento.findByIdAndUpdate(data.casamentoId, {
          ativo: false,
          dataFim: new Date()
        });

        await registrarLog(interaction.client, guild.id, 'divorcio', deId, {
          descricao: `<@${deId}> divorciou de <@${data.parceiro}>`
        });

        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x888888)
              .setDescription('💔 Divórcio concluído.')
          ],
          components: []
        });
      }

      pedidos.delete(chave);
    }
  });
                                                      }
