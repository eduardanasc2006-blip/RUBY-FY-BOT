import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType
} from 'discord.js';

import Ticket from '../db/models/Ticket.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { isEquipe } from '../utils/permissions.mjs';
import { registrarLog } from '../utils/logger.mjs';
import { isDBConnected } from '../utils/dbGuard.mjs';

/**
 * 🎯 CATEGORIAS ATUALIZADAS (SEM COMPRA)
 */
const CATEGORIAS = [
  { id: 'duvida', emoji: '❓', label: 'Dúvida', cor: 0x3498db },
  { id: 'problema', emoji: '⚠️', label: 'Problema', cor: 0xe74c3c },
  { id: 'parceria', emoji: '🤝', label: 'Parceria', cor: 0x9b59b6 },
  { id: 'denuncia', emoji: '🚨', label: 'Denúncia', cor: 0xf1c40f },
];

function gerarTicketId() {
  return `TK${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

export function register(client, configs) {

  /**
   * =========================
   * COMANDOS
   * =========================
   */
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';

    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();
    const guildId = msg.guild.id;

    /**
     * 🎫 ABRIR SUPORTE
     */
    if (cmd === 'suporte') {

      const abertos = await Ticket.countDocuments({
        guildId,
        userId: msg.author.id,
        status: 'aberto'
      });

      if (abertos >= 2) {
        return msg.reply({
          embeds: [embedErro('Você já tem **2 tickets abertos**.')]
        });
      }

      const row = new ActionRowBuilder().addComponents(
        CATEGORIAS.map(cat =>
          new ButtonBuilder()
            .setCustomId(`ticket:abrir:${cat.id}:${msg.author.id}`)
            .setLabel(`${cat.emoji} ${cat.label}`)
            .setStyle(ButtonStyle.Secondary)
        )
      );

      const embed = new EmbedBuilder()
        .setColor(0x7289da)
        .setTitle('🎫 Central de Atendimento')
        .setDescription(
          'Escolha o tipo de atendimento:\n\n' +
          '❓ Dúvidas\n⚠️ Problemas\n🤝 Parcerias\n🚨 Denúncias'
        )
        .setTimestamp();

      return msg.reply({ embeds: [embed], components: [row] });
    }

    /**
     * 🔒 FECHAR TICKET (manual)
     */
    if (cmd === 'fecharticket') {
      const ticket = await Ticket.findOne({
        guildId,
        channelId: msg.channel.id,
        status: 'aberto'
      });

      if (!ticket) {
        return msg.reply({
          embeds: [embedErro('Este canal não é um ticket.')]
        });
      }

      if (ticket.userId !== msg.author.id && !isEquipe(msg.member, cfg)) {
        return msg.reply({
          embeds: [embedErro('Sem permissão para fechar este ticket.')]
        });
      }

      await fecharTicket(msg.channel, ticket, msg.author, client, configs);
    }
  });

  /**
   * =========================
   * INTERAÇÕES
   * =========================
   */
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const { customId, guild, user, member } = interaction;

    /**
     * 🎫 ABRIR TICKET
     */
    if (customId.startsWith('ticket:abrir:')) {

      if (!isDBConnected()) {
        return interaction.reply({
          content: '⚠️ Banco de dados offline.',
          ephemeral: true
        });
      }

      const [, , catId, userId] = customId.split(':');

      if (user.id !== userId) {
        return interaction.reply({
          content: '❌ Esse botão não é seu.',
          ephemeral: true
        });
      }

      const cfg = configs.get(guild.id);

      const abertos = await Ticket.countDocuments({
        guildId: guild.id,
        userId: user.id,
        status: 'aberto'
      });

      if (abertos >= 2) {
        return interaction.reply({
          content: '❌ Você já tem 2 tickets abertos.',
          ephemeral: true
        });
      }

      const cat = CATEGORIAS.find(c => c.id === catId);
      const ticketId = gerarTicketId();

      const cargo = guild.roles.cache.get(cfg?.cargoSuporte || cfg?.cargoEquipe);

      const permissoes = [
        {
          id: guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        },
      ];

      if (cargo) {
        permissoes.push({
          id: cargo.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        });
      }

      const canal = await guild.channels.create({
        name: `ticket-${ticketId.toLowerCase()}`,
        type: ChannelType.GuildText,
        permissionOverwrites: permissoes,
        topic: `Ticket ${cat.label} | ${user.tag}`,
      });

      await Ticket.create({
        ticketId,
        guildId: guild.id,
        userId: user.id,
        categoria: cat.label,
        channelId: canal.id,
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket:fechar:${ticketId}`)
          .setLabel('🔒 Fechar')
          .setStyle(ButtonStyle.Danger)
      );

      const embed = new EmbedBuilder()
        .setColor(cat.cor)
        .setTitle(`${cat.emoji} Ticket — ${ticketId}`)
        .setDescription('Explique seu caso com detalhes.')
        .addFields(
          { name: 'Usuário', value: user.toString(), inline: true },
          { name: 'Categoria', value: cat.label, inline: true }
        )
        .setTimestamp();

      await canal.send({
        content: `${user} ${cargo ? cargo : ''}`,
        embeds: [embed],
        components: [row],
      });

      await registrarLog(
        interaction.client,
        guild.id,
        'ticket',
        user.id,
        { descricao: `Ticket ${ticketId} (${cat.label}) aberto.` },
        configs
      );

      return interaction.reply({
        content: `✅ Ticket criado: ${canal}`,
        ephemeral: true
      });
    }

    /**
     * 🔒 FECHAR TICKET
     */
    if (customId.startsWith('ticket:fechar:')) {
      const ticketId = customId.split(':')[2];

      const ticket = await Ticket.findOne({
        guildId: guild.id,
        ticketId
      });

      if (!ticket) {
        return interaction.reply({
          content: '❌ Ticket não encontrado.',
          ephemeral: true
        });
      }

      if (ticket.userId !== user.id && !isEquipe(member, configs.get(guild.id))) {
        return interaction.reply({
          content: '❌ Sem permissão.',
          ephemeral: true
        });
      }

      await fecharTicket(interaction.channel, ticket, user, interaction.client, configs);
      return interaction.deferUpdate();
    }
  });

  /**
   * =========================
   * TRANSCRIPT
   * =========================
   */
  client.on('messageCreate', async (msg) => {
    if (!isDBConnected() || msg.author.bot || !msg.guild) return;

    const ticket = await Ticket.findOne({
      guildId: msg.guild.id,
      channelId: msg.channel.id,
      status: 'aberto'
    });

    if (!ticket) return;

    await Ticket.updateOne(
      { _id: ticket._id },
      {
        $push: {
          transcript: {
            autor: msg.author.tag,
            conteudo: msg.content.slice(0, 500),
            data: new Date()
          }
        }
      }
    );
  });
}

/**
 * 🔒 FECHAR TICKET
 */
async function fecharTicket(canal, ticket, user, client, configs) {
  await Ticket.updateOne({ _id: ticket._id }, { status: 'fechado' });

  await canal.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('🔒 Ticket Fechado')
        .setDescription(`Fechado por ${user}`)
    ]
  });

  setTimeout(() => canal.delete().catch(() => {}), 5000);
            }
