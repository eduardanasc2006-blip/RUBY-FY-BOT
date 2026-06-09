import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType, AttachmentBuilder } from 'discord.js';
  import Ticket from '../db/models/Ticket.mjs';
  import { embedErro, embedSucesso } from '../utils/embeds.mjs';
  import { isEquipe } from '../utils/permissions.mjs';
  import { registrarLog } from '../utils/logger.mjs';
  import { isDBConnected } from '../utils/dbGuard.mjs';

  const CATEGORIAS = [
  { id: 'duvida', emoji: '❓', label: 'Dúvida', cor: 0x3498db },
  { id: 'problema', emoji: '⚠️', label: 'Problema', cor: 0xe74c3c },
  { id: 'parceria', emoji: '🤝', label: 'Parceria', cor: 0x9b59b6 },
  { id: 'outro', emoji: '📩', label: 'Outro Assunto', cor: 0xf1c40f },
];

  function gerarTicketId() {
    return `TK${Date.now().toString(36).toUpperCase().slice(-6)}`;
  }

  export const comandos = [
  { cmd: '!suporte / !ticket', desc: 'Abrir ticket de suporte.' },
  { cmd: '!painelsuporte', desc: 'Cria o painel permanente de suporte.' },
  { cmd: '!fecharticket', desc: 'Fechar ticket aberto.' },
  { cmd: '!sugerir <texto>', desc: 'Enviar sugestão para o servidor.' },
];

  export function register(client, configs) {
    if (client.__suporteRegistrado) return;
    client.__suporteRegistrado = true;

    // ── Handler único de messageCreate ──────────────────
    client.on('messageCreate', async (msg) => {
      if (msg.author.bot || !msg.guild) return;

      // Gravar transcript (sem prefixo necessário)
      if (isDBConnected()) {
        try {
          const ticket = await Ticket.findOne({ guildId: msg.guild.id, channelId: msg.channel.id, status: 'aberto' }).lean();
          if (ticket) {
            await Ticket.updateOne({ _id: ticket._id }, {
              $push: { transcript: { autor: msg.author.tag, conteudo: msg.content.slice(0, 500), data: new Date() } }
            });
          }
        } catch {}
      }

      const cfg = configs.get(msg.guild.id);
      const prefixo = cfg?.prefixo || '!';
      if (!msg.content.startsWith(prefixo)) return;

      const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
      const cmd = args.shift().toLowerCase();
      const guildId = msg.guild.id;
if (cmd === 'painelsuporte') {

  if (!isDBConnected()) {
    return msg.reply({
      embeds: [embedErro('Banco de dados offline.')]
    });
  }

  if (!isEquipe(msg.member, cfg)) {
    return msg.reply({
      embeds: [embedErro('Apenas a equipe pode criar painéis.')]
    });
  }

  const row = new ActionRowBuilder().addComponents(
    CATEGORIAS.map(cat =>
      new ButtonBuilder()
        .setCustomId(`ticket:painel:${cat.id}`)
        .setLabel(`${cat.emoji} ${cat.label}`)
        .setStyle(ButtonStyle.Secondary)
    )
  );

  const embed = new EmbedBuilder()
    .setColor(0x7289da)
    .setTitle('🎫 Central de Suporte')
   .setDescription(
  'Selecione a categoria do seu atendimento:\n\n' +
  '❓ Dúvida\n' +
  '⚠️ Problema\n' +
  '🤝 Parceria\n' +
  '📩 Outro Assunto'
)
    .setTimestamp();

  await msg.channel.send({
  embeds: [embed],
  components: [row]
});

await msg.delete().catch(() => {});
return;
}
      
      
      if (cmd === 'suporte' || cmd === 'ticket') {
        if (!isDBConnected()) return msg.reply({ embeds: [embedErro('Sistema de tickets offline (banco de dados não configurado).')] });

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

        return msg.reply({
          embeds: [new EmbedBuilder().setColor(0x7289da).setTitle('🎫 Abrir Ticket de Suporte').setDescription('Selecione a categoria do seu atendimento:').setTimestamp()],
          components: [row]
        });
      }

      if (cmd === 'fecharticket') {
        if (!isDBConnected()) return msg.reply({ embeds: [embedErro('Banco de dados offline.')] });
        const ticket = await Ticket.findOne({ guildId, channelId: msg.channel.id, status: 'aberto' });
        if (!ticket) return msg.reply({ embeds: [embedErro('Este canal não é um ticket aberto.')] });
        if (ticket.userId !== msg.author.id && !isEquipe(msg.member, cfg))
          return msg.reply({ embeds: [embedErro('Apenas o dono do ticket ou a equipe pode fechar.')] });
        await fecharTicket(msg.channel, ticket, msg.author, client, configs);
        return;
      }

      if (cmd === 'transcript') {
        if (!isDBConnected()) return msg.reply({ embeds: [embedErro('Banco de dados offline.')] });
        const ticket = await Ticket.findOne({ guildId, channelId: msg.channel.id });
        if (!ticket) return msg.reply({ embeds: [embedErro('Este canal não é um ticket.')] });
        const linhas = ticket.transcript.map(t =>
          `[${new Date(t.data).toLocaleString('pt-BR')}] ${t.autor}: ${t.conteudo}`
        ).join('\n');
        const buffer = Buffer.from(linhas || 'Transcript vazio.', 'utf-8');
        const arquivo = new AttachmentBuilder(buffer, { name: `transcript-${ticket.ticketId}.txt` });
        return msg.reply({ files: [arquivo] });
      }

      if (cmd === 'sugerir') {
        const texto = args.join(' ');
        if (!texto) return msg.reply({ embeds: [embedErro('Use: `!sugerir <texto>`')] });
        const cfg2 = configs.get(guildId);
        const canal = client.channels.cache.get(cfg2?.canalSugestoes);
        if (!canal) return msg.reply({ embeds: [embedErro('Canal de sugestões não configurado.')] });
        await canal.send({
          embeds: [new EmbedBuilder().setColor(0x3498db).setTitle('💡 Sugestão').setDescription(texto).setFooter({ text: `Enviada por ${msg.author.tag}` }).setTimestamp()]
        });
        return msg.reply({ embeds: [embedSucesso('Sugestão enviada!')] });
      }
    });

    // ── Interações ───────────────────────────────────────
    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isButton()) return;
      const { customId, guild, user, member } = interaction;

      if (
  customId.startsWith('ticket:abrir:') ||
  customId.startsWith('ticket:painel:')
) {
        if (!isDBConnected()) return interaction.reply({ content: '⚠️ Sistema de tickets offline.', flags: 64 });
       let catId;

if (customId.startsWith('ticket:painel:')) {
  catId = customId.split(':')[2];
} else {
  const [, , categoria, userId] = customId.split(':');

  if (user.id !== userId) {
    return interaction.reply({
      content: 'Este botão não é para você.',
      flags: 64
    });
  }

  catId = categoria;
}

        await interaction.deferReply({ flags: 64 });

        const cfg = configs.get(guild.id);
        const abertos = await Ticket.countDocuments({ guildId: guild.id, userId: user.id, status: 'aberto' });
        if (abertos >= 2) return interaction.editReply({ content: '❌ Você já tem 2 tickets abertos.' });

        if (!catId) {
  return interaction.editReply({
    content: '❌ Categoria inválida.'
  });
}
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
          return interaction.editReply({ content: '❌ Não consegui criar o canal. Verifique as permissões do bot.' });
        }

        await Ticket.create({ ticketId, guildId: guild.id, userId: user.id, categoria: cat.label, channelId: canal.id });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`ticket:fechar:${ticketId}`).setLabel('🔒 Fechar').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(`ticket:assumir:${ticketId}:${user.id}`).setLabel('👤 Assumir').setStyle(ButtonStyle.Primary),
        );

        await canal.send({
          content: `${user} ${cargo ? cargo : ''}`,
          embeds: [new EmbedBuilder().setColor(cat.cor).setTitle(`${cat.emoji} Ticket — ${ticketId}`)
            .addFields(
              { name: '👤 Usuário', value: user.toString(), inline: true },
              { name: '📋 Categoria', value: cat.label, inline: true },
              { name: '📅 Abertura', value: new Date().toLocaleString('pt-BR'), inline: true },
            )
            .setDescription('Um membro da equipe entrará em contato em breve. Descreva seu problema.')
            .setTimestamp()],
          components: [row]
        });
        await registrarLog(interaction.client, guild.id, 'ticket', user.id, { descricao: `<@${user.id}> abriu o ticket **${ticketId}** (${cat.label}).` }, configs);
        return interaction.editReply({ content: `✅ Ticket criado: ${canal}` });
      }

      if (customId.startsWith('ticket:fechar:')) {
        const ticketId = customId.split(':')[2];
        const ticket = await Ticket.findOne({ guildId: guild.id, ticketId });
        if (!ticket) return interaction.reply({ content: 'Ticket não encontrado.', flags: 64 });
        const cfg = configs.get(guild.id);
        if (ticket.userId !== user.id && !isEquipe(member, cfg))
          return interaction.reply({ content: 'Sem permissão para fechar este ticket.', flags: 64 });
        await fecharTicket(interaction.channel, ticket, user, interaction.client, configs);
        await interaction.deferUpdate().catch(() => {});
      }

      if (customId.startsWith('ticket:assumir:')) {
        const [, , ticketId] = customId.split(':');
        const cfg = configs.get(guild.id);
        if (!isEquipe(member, cfg)) return interaction.reply({ content: 'Apenas a equipe pode assumir tickets.', flags: 64 });
        await Ticket.updateOne({ guildId: guild.id, ticketId }, { responsavel: user.id });
        await interaction.reply({ content: `✅ ${user} assumiu o atendimento!` });
      }
    });
  }

  async function fecharTicket(canal, ticket, fechadoPor, client, configs) {
    await Ticket.updateOne({ _id: ticket._id }, { status: 'fechado' });
    await canal.send({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle('🔒 Ticket Fechado').setDescription(`Ticket **${ticket.ticketId}** fechado por ${fechadoPor.toString()}`).setTimestamp()] }).catch(() => {});
    setTimeout(() => canal.delete().catch(() => {}), 5_000);
    await registrarLog(client, ticket.guildId, 'ticket', fechadoPor.id, { descricao: `Ticket **${ticket.ticketId}** fechado por <@${fechadoPor.id}>` }, configs);
  }
  
