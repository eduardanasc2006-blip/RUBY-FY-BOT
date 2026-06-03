import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType } from 'discord.js';
import Ticket from '../db/models/Ticket.mjs';
import { embedErro, embedSucesso } from '../utils/embeds.mjs';
import { isEquipe } from '../utils/permissions.mjs';
import { registrarLog } from '../utils/logger.mjs';
import { isDBConnected } from '../utils/dbGuard.mjs';

const CATEGORIAS = [
  { id: 'compra', emoji: '🛒', label: 'Compra', cor: 0x2ecc71 },
  { id: 'duvida', emoji: '❓', label: 'Dúvida', cor: 0x3498db },
  { id: 'problema', emoji: '⚠️', label: 'Problema', cor: 0xe74c3c },
  { id: 'parceria', emoji: '🤝', label: 'Parceria', cor: 0x9b59b6 },
];

function gerarTicketId() {
  return `TK${Date.now().toString(36).toUpperCase().slice(-6)}`;
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

    if (cmd === 'suporte' || cmd === 'ticket') {
      const abertos = await Ticket.countDocuments({ guildId, userId: msg.author.id, status: 'aberto' });
      if (abertos >= 2) return msg.reply({ embeds: [embedErro('Você já tem **2 tickets abertos**. Feche um antes de abrir outro.')] });

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
        .setTitle('🎫 Abrir Ticket de Suporte')
        .setDescription('Selecione a categoria do seu atendimento:')
        .setTimestamp();

      return msg.reply({ embeds: [embed], components: [row] });
    }

    if (cmd === 'fecharticket') {
      const ticket = await Ticket.findOne({ guildId, channelId: msg.channel.id, status: 'aberto' });
      if (!ticket) return msg.reply({ embeds: [embedErro('Este canal não é um ticket aberto.')] });
      if (ticket.userId !== msg.author.id && !isEquipe(msg.member, cfg))
        return msg.reply({ embeds: [embedErro('Apenas o dono do ticket ou a equipe pode fechar.')] });

      await fecharTicket(msg.channel, ticket, msg.author, client, configs);
      return;
    }

    if (cmd === 'transcript') {
      const ticket = await Ticket.findOne({ guildId, channelId: msg.channel.id });
      if (!ticket) return msg.reply({ embeds: [embedErro('Este canal não é um ticket.')] });

      const linhas = ticket.transcript.map(t =>
        `[${new Date(t.data).toLocaleString('pt-BR')}] ${t.autor}: ${t.conteudo}`
      ).join('\n');

      const { AttachmentBuilder } = await import('discord.js');
      const buffer = Buffer.from(linhas || 'Transcript vazio.', 'utf-8');
      const arquivo = new AttachmentBuilder(buffer, { name: `transcript-${ticket.ticketId}.txt` });
      return msg.reply({ files: [arquivo] });
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    const { customId, guild, user, member } = interaction;

    if (customId.startsWith('ticket:abrir:')) {
      if (!isDBConnected()) return interaction.reply({ content: '⚠️ Sistema de tickets offline (banco de dados não configurado).', ephemeral: true });
      const [, , catId, userId] = customId.split(':');
      if (user.id !== userId) return interaction.reply({ content: 'Este botão não é para você.', ephemeral: true });

      const cfg = configs.get(guild.id);
      const abertos = await Ticket.countDocuments({ guildId: guild.id, userId: user.id, status: 'aberto' });
      if (abertos >= 2) return interaction.reply({ content: '❌ Você já tem 2 tickets abertos.', ephemeral: true });

      const cat = CATEGORIAS.find(c => c.id === catId);
      const ticketId = gerarTicketId();

      const cargo = guild.roles.cache.get(cfg?.cargoSuporte || cfg?.cargoEquipe);
      const permissoes = [
        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
      ];
      if (cargo) permissoes.push({ id: cargo.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });

      let canal;
      try {
        canal = await guild.channels.create({
          name: `ticket-${ticketId.toLowerCase()}`,
          type: ChannelType.GuildText,
          permissionOverwrites: permissoes,
          topic: `Ticket de ${user.tag} | ${cat.label}`,
        });
      } catch {
        return interaction.reply({ content: '❌ Não consegui criar o canal. Verifique permissões do bot.', ephemeral: true });
      }

      await Ticket.create({ ticketId, guildId: guild.id, userId: user.id, categoria: cat.label, channelId: canal.id });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ticket:fechar:${ticketId}`).setLabel('🔒 Fechar').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`ticket:assumir:${ticketId}:${user.id}`).setLabel('👤 Assumir').setStyle(ButtonStyle.Primary),
      );

      const embed = new EmbedBuilder()
        .setColor(cat.cor)
        .setTitle(`${cat.emoji} Ticket — ${ticketId}`)
        .addFields(
          { name: '👤 Usuário', value: user.toString(), inline: true },
          { name: '📋 Categoria', value: cat.label, inline: true },
          { name: '📅 Abertura', value: new Date().toLocaleString('pt-BR'), inline: true },
        )
        .setDescription('Um membro da equipe entrará em contato em breve. Descreva seu problema.')
        .setTimestamp();

      await canal.send({ content: `${user} ${cargo ? cargo : ''}`, embeds: [embed], components: [row] });
      await registrarLog(interaction.client, guild.id, 'ticket', user.id, { descricao: `<@${user.id}> abriu o ticket **${ticketId}** (${cat.label}).` }, configs);
      await interaction.reply({ content: `✅ Ticket criado: ${canal}`, ephemeral: true });
    }

    if (customId.startsWith('ticket:fechar:')) {
      const ticketId = customId.split(':')[2];
      const ticket = await Ticket.findOne({ guildId: guild.id, ticketId });
      if (!ticket) return interaction.reply({ content: 'Ticket não encontrado.', ephemeral: true });
      const cfg = configs.get(guild.id);
      if (ticket.userId !== user.id && !isEquipe(member, cfg))
        return interaction.reply({ content: 'Sem permissão para fechar este ticket.', ephemeral: true });
      await fecharTicket(interaction.channel, ticket, user, interaction.client, configs);
      await interaction.deferUpdate().catch(() => {});
    }

    if (customId.startsWith('ticket:assumir:')) {
      const [, , ticketId, userId] = customId.split(':');
      const cfg = configs.get(guild.id);
      if (!isEquipe(member, cfg)) return interaction.reply({ content: 'Apenas a equipe pode assumir tickets.', ephemeral: true });
      await Ticket.updateOne({ guildId: guild.id, ticketId }, { responsavel: user.id });
      await interaction.reply({ content: `✅ ${user} assumiu o atendimento!` });
    }
  });

  client.on('messageCreate', async (msg) => {
    if (!isDBConnected() || msg.author.bot || !msg.guild) return;
    try {
      const ticket = await Ticket.findOne({ guildId: msg.guild.id, channelId: msg.channel.id, status: 'aberto' }).lean();
      if (!ticket) return;
      await Ticket.updateOne({ _id: ticket._id }, {
        $push: { transcript: { autor: msg.author.tag, conteudo: msg.content.slice(0, 500), data: new Date() } }
      });
    } catch {}
  });
}

async function fecharTicket(canal, ticket, fechadoPor, client, configs) {
  await Ticket.updateOne({ _id: ticket._id }, { status: 'fechado' });
  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle('🔒 Ticket Fechado')
    .setDescription(`Ticket **${ticket.ticketId}** fechado por ${fechadoPor.toString()}`)
    .setTimestamp();
  await canal.send({ embeds: [embed] }).catch(() => {});
  setTimeout(() => canal.delete().catch(() => {}), 5_000);
  await registrarLog(client, ticket.guildId, 'ticket', fechadoPor.id, { descricao: `Ticket **${ticket.ticketId}** fechado por <@${fechadoPor.id}>` }, configs);
}
