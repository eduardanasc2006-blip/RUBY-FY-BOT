import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';

import Casamento from '../db/models/Casamento.mjs';
import Afinidade from '../db/models/Afinidade.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { registrarLog } from '../utils/logger.mjs';
import { nivelAfinidade } from '../utils/nivelCalc.mjs';

const pedidosPendentes = new Map();

/* =========================
   HELPERS
========================= */

function chavePedido(tipo, guildId, a, b) {
  return `${tipo}:${guildId}:${[a, b].sort().join(':')}`;
}

/* =========================
   REGISTER
========================= */

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();
    const guildId = msg.guild.id;

    /* =========================
       CASAR
    ========================= */

    if (cmd === 'casar') {
      const alvo = msg.mentions.users.first();

      if (!alvo || alvo.bot || alvo.id === msg.author.id) {
        return msg.reply({
          embeds: [embedErro('Mencione um usuário válido para se casar.')]
        });
      }

      const jaCasado = await Casamento.findOne({
        guildId,
        ativo: true,
        $or: [
          { userId1: msg.author.id },
          { userId2: msg.author.id }
        ]
      });

      if (jaCasado) {
        return msg.reply({
          embeds: [embedErro('Você já está casado(a)! Use `!divorciar`.')]
        });
      }

      const alvoCasado = await Casamento.findOne({
        guildId,
        ativo: true,
        $or: [
          { userId1: alvo.id },
          { userId2: alvo.id }
        ]
      });

      if (alvoCasado) {
        return msg.reply({
          embeds: [embedErro(`<@${alvo.id}> já está casado(a).`)]
        });
      }

      const chave = chavePedido('casamento', guildId, msg.author.id, alvo.id);

      if (pedidosPendentes.has(chave)) {
        return msg.reply({
          embeds: [embedErro('Já existe um pedido pendente para esse casal.')]
        });
      }

      pedidosPendentes.set(chave, {
        de: msg.author.id,
        para: alvo.id,
        tipo: 'casamento'
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`casar:aceitar:${msg.author.id}:${alvo.id}`)
          .setLabel('💍 Aceitar')
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`casar:recusar:${msg.author.id}:${alvo.id}`)
          .setLabel('❌ Recusar')
          .setStyle(ButtonStyle.Danger)
      );

      const embed = new EmbedBuilder()
        .setColor(0xff69b4)
        .setTitle('💍 Pedido de Casamento!')
        .setDescription(
          `<@${msg.author.id}> pediu <@${alvo.id}> em casamento!\n\n<@${alvo.id}>, você aceita?`
        )
        .setTimestamp();

      const m = await msg.channel.send({
        embeds: [embed],
        components: [row]
      });

      setTimeout(() => pedidosPendentes.delete(chave), 60_000);
      return;
    }

    /* =========================
       DIVORCIAR
    ========================= */

    if (cmd === 'divorciar') {
      const casamento = await Casamento.findOne({
        guildId,
        ativo: true,
        $or: [
          { userId1: msg.author.id },
          { userId2: msg.author.id }
        ]
      });

      if (!casamento) {
        return msg.reply({
          embeds: [embedErro('Você não está casado(a).')]
        });
      }

      const parceiro =
        casamento.userId1 === msg.author.id
          ? casamento.userId2
          : casamento.userId1;

      const chave = chavePedido('div', guildId, msg.author.id, parceiro);

      pedidosPendentes.set(chave, {
        casamentoId: casamento._id,
        parceiro
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`div:aceitar:${msg.author.id}`)
          .setLabel('💔 Confirmar Divórcio')
          .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
          .setCustomId(`div:recusar:${msg.author.id}`)
          .setLabel('❌ Cancelar')
          .setStyle(ButtonStyle.Secondary)
      );

      const embed = new EmbedBuilder()
        .setColor(0x888888)
        .setTitle('💔 Pedido de Divórcio')
        .setDescription(
          `<@${msg.author.id}> quer se divorciar de <@${parceiro}>.`
        )
        .setTimestamp();

      await msg.channel.send({
        embeds: [embed],
        components: [row]
      });

      setTimeout(() => pedidosPendentes.delete(chave), 60_000);
      return;
    }

    /* =========================
       PARCEIRO
    ========================= */

    if (cmd === 'parceiro') {
      const alvo = msg.mentions.users.first() || msg.author;

      const casamento = await Casamento.findOne({
        guildId,
        ativo: true,
        $or: [
          { userId1: alvo.id },
          { userId2: alvo.id }
        ]
      });

      if (!casamento) {
        return msg.reply({
          embeds: [embedErro('Usuário não está casado(a).')]
        });
      }

      const parceiro =
        casamento.userId1 === alvo.id
          ? casamento.userId2
          : casamento.userId1;

      const dias = Math.floor(
        (Date.now() - casamento.dataCasamento.getTime()) / 86400000
      );

      const u1 = [alvo.id, parceiro].sort()[0];
      const u2 = [alvo.id, parceiro].sort()[1];

      const afin = await Afinidade.findOne({
        guildId,
        userId1: u1,
        userId2: u2
      });

      const embed = new EmbedBuilder()
        .setColor(0xff69b4)
        .setTitle('💍 Informações do Casal')
        .addFields(
          { name: '💑 Parceiro', value: `<@${parceiro}>`, inline: true },
          { name: '📅 Dias juntos', value: `${dias}`, inline: true },
          {
            name: '💜 Afinidade',
            value: `${afin?.pontos || 0} pts (${nivelAfinidade(afin?.pontos || 0)})`,
            inline: true
          },
          {
            name: '🤝 Interações',
            value: String(afin?.interacoes || 0),
            inline: true
          }
        )
        .setTimestamp();

      return msg.reply({ embeds: [embed] });
    }

    /* =========================
       INTERACTIONS
    ========================= */

    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isButton()) return;

      const { customId, guild, user } = interaction;

      /* CASAMENTO */
      if (customId.startsWith('casar:')) {
        const [, acao, deId, paraId] = customId.split(':');

        const chave = chavePedido('casamento', guild.id, deId, paraId);
        const pedido = pedidosPendentes.get(chave);

        if (!pedido) {
          return interaction.reply({
            content: 'Pedido expirado.',
            ephemeral: true
          });
        }

        if (user.id !== paraId) {
          return interaction.reply({
            content: 'Este botão não é para você.',
            ephemeral: true
          });
        }

        if (acao === 'aceitar') {
          await Casamento.create({
            guildId: guild.id,
            userId1: deId,
            userId2: paraId,
            ativo: true,
            dataCasamento: new Date()
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

          try {
            await registrarLog(
              interaction.client,
              guild.id,
              'casamento',
              deId,
              { descricao: `<@${deId}> casou com <@${paraId}>` },
              null
            );
          } catch {}

        } else {
          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor(0x888888)
                .setDescription(`💔 Pedido recusado.`)
            ],
            components: []
          });
        }

        pedidosPendentes.delete(chave);
      }

      /* DIVÓRCIO */
      if (customId.startsWith('div:')) {
        const [, acao, deId] = customId.split(':');

        const chave = chavePedido('div', guild.id, deId, user.id);
        const pedido = pedidosPendentes.get(chave);

        if (!pedido) {
          return interaction.reply({
            content: 'Pedido expirado.',
            ephemeral: true
          });
        }

        if (acao === 'aceitar') {
          await Casamento.findByIdAndUpdate(pedido.casamentoId, {
            ativo: false,
            dataFim: new Date()
          });

          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor(0x888888)
                .setDescription(`💔 Divórcio realizado.`)
            ],
            components: []
          });

          try {
            await registrarLog(
              interaction.client,
              guild.id,
              'divorcio',
              deId,
              { descricao: `Divórcio realizado` },
              null
            );
          } catch {}
        } else {
          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor(0x2ecc71)
                .setDescription('❌ Cancelado.')
            ],
            components: []
          });
        }

        pedidosPendentes.delete(chave);
      }
    });
  });
}
