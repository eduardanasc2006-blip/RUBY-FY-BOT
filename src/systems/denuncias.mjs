import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } from 'discord.js';
import Denuncia from '../db/models/Denuncia.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { isEquipe } from '../utils/permissions.mjs';
import { registrarLog } from '../utils/logger.mjs';

const MOTIVOS = ['Spam', 'Ofensa', 'Golpe', 'Conteúdo impróprio', 'Outro'];
const sessoesAtivas = new Map();

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();
    const guildId = msg.guild.id;

    if (cmd === 'denunciar') {
      const alvo = msg.mentions.users.first();
      if (!alvo || alvo.bot || alvo.id === msg.author.id)
        return msg.reply({ embeds: [embedErro('Mencione um usuário válido para denunciar.')] });

      const sessaoKey = `den:${msg.author.id}:${guildId}`;
      sessoesAtivas.set(sessaoKey, {
        etapa: 'motivo',
        denunciadoId: alvo.id,
        dados: {},
        mensagens: [],
      });

      const row = new ActionRowBuilder().addComponents(
        MOTIVOS.map((m, i) =>
          new ButtonBuilder()
            .setCustomId(`den:motivo:${i}:${msg.author.id}:${guildId}`)
            .setLabel(m)
            .setStyle(ButtonStyle.Secondary)
        )
      );

      await msg.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle('🚨 Denúncia — Passo 1/3')
          .setDescription(`Selecione o motivo da denúncia contra <@${alvo.id}>:`)],
        components: [row],
      });

      setTimeout(() => sessoesAtivas.delete(sessaoKey), 120_000);
      return;
    }

    const sessaoKey = `den:${msg.author.id}:${guildId}`;
    if (sessoesAtivas.has(sessaoKey)) {
      const s = sessoesAtivas.get(sessaoKey);

      if (s.etapa === 'descricao') {
        s.dados.descricao = msg.content.slice(0, 500);
        s.etapa = 'provas';
        await msg.reply({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle('🚨 Denúncia — Passo 3/3').setDescription('Envie o link das **provas** (print, link de mensagem) ou `pular`:')] });
      } else if (s.etapa === 'provas') {
        s.dados.provas = msg.content.toLowerCase() === 'pular' ? '' : msg.content.slice(0, 500);
        sessoesAtivas.delete(sessaoKey);
        await enviarDenuncia(msg, client, configs, guildId, s);
      }
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() || !interaction.customId.startsWith('den:')) return;
    const parts = interaction.customId.split(':');

    if (parts[1] === 'motivo') {
      const [, , motIdx, userId, guildId] = parts;
      if (interaction.user.id !== userId) return interaction.reply({ content: 'Este botão não é para você.', ephemeral: true });

      const sessaoKey = `den:${userId}:${guildId}`;
      const s = sessoesAtivas.get(sessaoKey);
      if (!s) return interaction.reply({ content: 'Sessão expirada.', ephemeral: true });

      s.dados.motivo = MOTIVOS[parseInt(motIdx)];
      s.etapa = 'descricao';

      await interaction.update({
        embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle('🚨 Denúncia — Passo 2/3').setDescription(`Motivo: **${s.dados.motivo}**\n\nDescreva o ocorrido (detalhes):`).setTimestamp()],
        components: [],
      });
    }
  });
}

async function enviarDenuncia(msg, client, configs, guildId, sessao) {
  const cfg = configs.get(guildId);
  const den = await Denuncia.create({
    guildId,
    denuncianteId: msg.author.id,
    denunciadoId: sessao.denunciadoId,
    motivo: sessao.dados.motivo,
    descricao: sessao.dados.descricao,
    provas: sessao.dados.provas,
  });

  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle('🚨 Nova Denúncia Registrada')
    .addFields(
      { name: '👤 Denunciante', value: `<@${msg.author.id}>`, inline: true },
      { name: '⚠️ Denunciado', value: `<@${sessao.denunciadoId}>`, inline: true },
      { name: '📋 Motivo', value: sessao.dados.motivo, inline: true },
      { name: '📝 Descrição', value: sessao.dados.descricao || 'N/A', inline: false },
      { name: '🔗 Provas', value: sessao.dados.provas || 'Nenhuma', inline: false },
    )
    .setTimestamp();

  if (cfg?.canalDenuncias) {
    const canal = client.channels.cache.get(cfg.canalDenuncias);
    if (canal) await canal.send({ embeds: [embed] }).catch(() => {});
  }

  await msg.reply({ embeds: [new EmbedBuilder().setColor(0x2ecc71).setDescription('✅ Sua denúncia foi registrada e enviada para a equipe.')] });
  await registrarLog(client, guildId, 'denuncia', msg.author.id, { descricao: `<@${msg.author.id}> denunciou <@${sessao.denunciadoId}>. Motivo: ${sessao.dados.motivo}` }, configs);
}
