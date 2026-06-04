import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
} from 'discord.js';

import Ticket from '../db/models/Ticket.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { isEquipe } from '../utils/permissions.mjs';
import { registrarLog } from '../utils/logger.mjs';
import { isDBConnected } from '../utils/dbGuard.mjs';

/**
 * 🎯 Atendimento = SISTEMA DE COMPRA / SIMULAÇÃO
 * (NÃO é suporte)
 */
const CATEGORIAS = [
  { id: 'compra', emoji: '🛒', label: 'Comprar Produto', cor: 0x2ecc71 },
  { id: 'simulacao', emoji: '📊', label: 'Simular Compra', cor: 0x3498db },
];

function gerarTicketId() {
  return `AT${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';

    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    const guildId = msg.guild.id;

    /**
     * =========================
     * !atendimento
     * =========================
     */
    if (cmd === 'atendimento') {
      if (!isDBConnected()) {
        return msg.reply({
          embeds: [embedErro('Banco de dados offline.')]
        });
      }

      const abertos = await Ticket.countDocuments({
        guildId,
        userId: msg.author.id,
        status: 'aberto',
        type: 'atendimento',
      });

      if (abertos >= 2) {
        return msg.reply({
          embeds: [embedErro('Você já tem **2 atendimentos abertos**.')]
        });
      }

      const row = new ActionRowBuilder().addComponents(
        CATEGORIAS.map(cat =>
          new ButtonBuilder()
            .setCustomId(`atendimento:abrir:${cat.id}:${msg.author.id}`)
            .setLabel(`${cat.emoji} ${cat.label}`)
            .setStyle(ButtonStyle.Primary)
        )
      );

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🛒 Central de Atendimento')
        .setDescription(
          'Escolha o tipo de atendimento:\n\n' +
          '🛒 **Comprar Produto** → abrir ticket de compra\n' +
          '📊 **Simular Compra** → calcular valores e planos'
        );

      return msg.reply({
        embeds: [embed],
        components: [row],
      });
    }
  });

  /**
   * =========================
   * INTERAÇÕES
   * =========================
   */
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const { customId, guild, user } = interaction;

    if (!customId.startsWith('atendimento:abrir:')) return;

    const [, , catId, userId] = customId.split(':');

    if (user.id !== userId) {
      return interaction.reply({
        content: '❌ Esse botão não é seu.',
        ephemeral: true,
      });
    }

    const cfg = configs.get(guild.id);

    const cat = CATEGORIAS.find(c => c.id === catId);
    if (!cat) {
      return interaction.reply({
        content: '❌ Categoria inválida.',
        ephemeral: true,
      });
    }

    const ticketId = gerarTicketId();

    const cargoEquipe =
      guild.roles.cache.get(cfg?.cargoEquipe) ||
      guild.roles.cache.get(cfg?.cargoSuporte);

    const perms = [
      {
        id: guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      {
        id: user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
        ],
      },
    ];

    if (cargoEquipe) {
      perms.push({
        id: cargoEquipe.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
        ],
      });
    }

    const canal = await guild.channels.create({
      name: `atendimento-${ticketId.toLowerCase()}`,
      type: ChannelType.GuildText,
      permissionOverwrites: perms,
      topic: `Atendimento de compra | ${user.tag} | ${cat.label}`,
    });

    await Ticket.create({
      ticketId,
      guildId: guild.id,
      userId: user.id,
      categoria: cat.label,
      channelId: canal.id,
      status: 'aberto',
      type: 'atendimento', // 🔥 DIFERENCIAL DO SUPORTE
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`atendimento:fechar:${ticketId}`)
        .setLabel('🔒 Fechar')
        .setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setColor(cat.cor)
      .setTitle(`${cat.emoji} Atendimento — ${ticketId}`)
      .setDescription(
        cat.id === 'compra'
          ? 'Explique o que deseja comprar e aguarde atendimento.'
          : 'Informe quanto deseja simular e veja valores.'
      )
      .addFields(
        { name: '👤 Usuário', value: `<@${user.id}>`, inline: true },
        { name: '📦 Tipo', value: cat.label, inline: true },
      )
      .setTimestamp();

    await canal.send({
      content: `<@${user.id}> ${cargoEquipe ? `<@&${cargoEquipe.id}>` : ''}`,
      embeds: [embed],
      components: [row],
    });

    await interaction.reply({
      content: `✅ Atendimento criado: ${canal}`,
      ephemeral: true,
    });

    await registrarLog(
      interaction.client,
      guild.id,
      'atendimento',
      user.id,
      { descricao: `${user.tag} abriu atendimento (${cat.label})` },
      configs
    );
  });

  /**
   * =========================
   * FECHAR ATENDIMENTO
   * =========================
   */
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const { customId, guild, user } = interaction;

    if (!customId.startsWith('atendimento:fechar:')) return;

    const ticketId = customId.split(':')[2];

    const ticket = await Ticket.findOne({
      guildId: guild.id,
      ticketId,
      type: 'atendimento',
    });

    if (!ticket) {
      return interaction.reply({
        content: 'Ticket não encontrado.',
        ephemeral: true,
      });
    }

    if (ticket.userId !== user.id) {
      return interaction.reply({
        content: '❌ Você não pode fechar este atendimento.',
        ephemeral: true,
      });
    }

    await Ticket.updateOne({ _id: ticket._id }, { status: 'fechado' });

    await interaction.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle('🔒 Atendimento encerrado')
          .setDescription(`Fechado por <@${user.id}>`)
      ]
    });

    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
  });
    }
