import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Casamento from '../db/models/Casamento.mjs';
import Afinidade from '../db/models/Afinidade.mjs';
import { embedErro, embedSucesso } from '../utils/embeds.mjs';
import { registrarLog } from '../utils/logger.mjs';
import { nivelAfinidade } from '../utils/nivelCalc.mjs';

const pedidosPendentes = new Map();

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();
    const guildId = msg.guild.id;

    if (cmd === 'casar') {
      const alvo = msg.mentions.users.first();
      if (!alvo || alvo.bot || alvo.id === msg.author.id)
        return msg.reply({ embeds: [embedErro('Mencione um usuário válido para se casar.')] });

      const jaExiste = await Casamento.findOne({ guildId, $or: [{ userId1: msg.author.id }, { userId2: msg.author.id }], ativo: true });
      if (jaExiste) return msg.reply({ embeds: [embedErro('Você já está casado(a)! Use `!divorciar` primeiro.')] });

      const alvoJaCasado = await Casamento.findOne({ guildId, $or: [{ userId1: alvo.id }, { userId2: alvo.id }], ativo: true });
      if (alvoJaCasado) return msg.reply({ embeds: [embedErro(`<@${alvo.id}> já está casado(a).`)] });

      const chave = `${guildId}:${alvo.id}`;
      if (pedidosPendentes.has(chave)) return msg.reply({ embeds: [embedErro('Já existe um pedido pendente para esse usuário.')] });

      pedidosPendentes.set(chave, { de: msg.author.id, para: alvo.id });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`casar:aceitar:${msg.author.id}:${alvo.id}`).setLabel('💍 Aceitar').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`casar:recusar:${msg.author.id}:${alvo.id}`).setLabel('❌ Recusar').setStyle(ButtonStyle.Danger),
      );
      const embed = new EmbedBuilder()
        .setColor(0xff69b4)
        .setTitle('💍 Pedido de Casamento!')
        .setDescription(`<@${msg.author.id}> está pedindo <@${alvo.id}> em casamento!\n\n<@${alvo.id}>, você aceita?`)
        .setTimestamp();
      await msg.channel.send({ embeds: [embed], components: [row] });

      setTimeout(() => pedidosPendentes.delete(chave), 60_000);
      return;
    }

    if (cmd === 'divorciar') {
      const casamento = await Casamento.findOne({ guildId, $or: [{ userId1: msg.author.id }, { userId2: msg.author.id }], ativo: true });
      if (!casamento) return msg.reply({ embeds: [embedErro('Você não está casado(a).')] });

      const parceiro = casamento.userId1 === msg.author.id ? casamento.userId2 : casamento.userId1;
      const chave = `div:${guildId}:${msg.author.id}`;
      pedidosPendentes.set(chave, { casamentoId: casamento._id, parceiro });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`div:aceitar:${msg.author.id}`).setLabel('💔 Confirmar Divórcio').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`div:recusar:${msg.author.id}`).setLabel('❌ Cancelar').setStyle(ButtonStyle.Secondary),
      );
      const embed = new EmbedBuilder()
        .setColor(0x888888)
        .setTitle('💔 Pedido de Divórcio')
        .setDescription(`<@${msg.author.id}> quer se divorciar de <@${parceiro}>.\n\n<@${parceiro}>, confirma?`)
        .setTimestamp();
      await msg.channel.send({ embeds: [embed], components: [row] });
      setTimeout(() => pedidosPendentes.delete(chave), 60_000);
      return;
    }

    if (cmd === 'parceiro') {
      const alvo = msg.mentions.users.first() || msg.author;
      const casamento = await Casamento.findOne({ guildId, $or: [{ userId1: alvo.id }, { userId2: alvo.id }], ativo: true });
      if (!casamento) return msg.reply({ embeds: [embedErro(`${alvo.id === msg.author.id ? 'Você não está' : 'Esse usuário não está'} casado(a).`)] });

      const parcId = casamento.userId1 === alvo.id ? casamento.userId2 : casamento.userId1;
      const dias = Math.floor((Date.now() - casamento.dataCasamento.getTime()) / 86400000);

      const u1 = Math.min(alvo.id, parcId);
      const u2 = Math.max(alvo.id, parcId);
      const afin = await Afinidade.findOne({ guildId, userId1: u1, userId2: u2 });

      const embed = new EmbedBuilder()
        .setColor(0xff69b4)
        .setTitle('💍 Informações do Casal')
        .addFields(
          { name: '💑 Parceiro(a)', value: `<@${parcId}>`, inline: true },
          { name: '📅 Casados há', value: `${dias} dia(s)`, inline: true },
          { name: '📆 Data', value: casamento.dataCasamento.toLocaleDateString('pt-BR'), inline: true },
          { name: '💜 Afinidade', value: `${afin?.pontos || 0} pts (${nivelAfinidade(afin?.pontos || 0)})`, inline: true },
          { name: '🤝 Interações', value: String(afin?.interacoes || 0), inline: true },
        )
        .setTimestamp();
      return msg.reply({ embeds: [embed] });
    }

    if (cmd === 'aniversariocasamento') {
      const casamento = await Casamento.findOne({ guildId, $or: [{ userId1: msg.author.id }, { userId2: msg.author.id }], ativo: true });
      if (!casamento) return msg.reply({ embeds: [embedErro('Você não está casado(a).')] });

      const agora = new Date();
      const inicio = casamento.dataCasamento;
      const dias = Math.floor((agora - inicio) / 86400000);
      const meses = Math.floor(dias / 30);
      const anos = Math.floor(dias / 365);

      const proximoAniv = new Date(inicio);
      proximoAniv.setFullYear(agora.getFullYear() + (agora > new Date(inicio.setFullYear(agora.getFullYear())) ? 1 : 0));
      const diasAniv = Math.ceil((proximoAniv - agora) / 86400000);

      const embed = new EmbedBuilder()
        .setColor(0xff69b4)
        .setTitle('💍 Aniversário de Casamento')
        .addFields(
          { name: '⏳ Tempo juntos', value: `${anos} ano(s), ${meses % 12} mês(es), ${dias % 30} dia(s)`, inline: false },
          { name: '🎂 Próximo aniversário', value: `Em ${diasAniv} dia(s)`, inline: true },
        )
        .setTimestamp();
      return msg.reply({ embeds: [embed] });
    }

    if (cmd === 'topcasais') {
      const casamentos = await Casamento.find({ guildId, ativo: true }).lean();
      const pares = await Promise.all(casamentos.slice(0, 10).map(async (c) => {
        const u1 = Math.min(c.userId1, c.userId2);
        const u2 = Math.max(c.userId1, c.userId2);
        const afin = await Afinidade.findOne({ guildId, userId1: u1, userId2: u2 });
        const dias = Math.floor((Date.now() - c.dataCasamento.getTime()) / 86400000);
        return { c, afin: afin?.pontos || 0, dias };
      }));
      pares.sort((a, b) => b.afin - a.afin);
      const linhas = pares.map((p, i) => `**#${i + 1}** <@${p.c.userId1}> ❤️ <@${p.c.userId2}> — ${p.afin} pts • ${p.dias} dias`);
      const embed = new EmbedBuilder()
        .setColor(0xff69b4)
        .setTitle('👑 Top Casais')
        .setDescription(linhas.join('\n') || 'Nenhum casal registrado.')
        .setTimestamp();
      return msg.reply({ embeds: [embed] });
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    const { customId, guild, user } = interaction;

    if (customId.startsWith('casar:')) {
      const [, acao, deId, paraId] = customId.split(':');
      if (user.id !== paraId) return interaction.reply({ content: 'Este botão não é para você.', ephemeral: true });

      if (acao === 'aceitar') {
        const casamentoExistente = await Casamento.findOne({ guildId: guild.id, $or: [{ userId1: deId }, { userId1: paraId }, { userId2: deId }, { userId2: paraId }], ativo: true });
        if (casamentoExistente) {
          await interaction.update({ components: [] });
          return interaction.followUp({ embeds: [embedErro('Um dos usuários já está casado.')] });
        }
        await Casamento.create({ guildId: guild.id, userId1: deId, userId2: paraId });
        const embed = new EmbedBuilder().setColor(0xff69b4).setTitle('💍 Casamento Realizado!').setDescription(`<@${deId}> e <@${paraId}> agora estão casados! 🎉`).setTimestamp();
        await interaction.update({ embeds: [embed], components: [] });
        await registrarLog(interaction.client, guild.id, 'casamento', deId, { descricao: `<@${deId}> e <@${paraId}> se casaram.` }, null);
      } else {
        await interaction.update({ embeds: [new EmbedBuilder().setColor(0x888888).setDescription(`💔 <@${paraId}> recusou o pedido de casamento.`)], components: [] });
      }
      pedidosPendentes.delete(`${guild.id}:${paraId}`);
    }

    if (customId.startsWith('div:')) {
      const [, acao, deId] = customId.split(':');
      const chave = `div:${guild.id}:${deId}`;
      const dados = pedidosPendentes.get(chave);
      if (!dados) return interaction.reply({ content: 'Pedido expirado.', ephemeral: true });
      if (user.id !== dados.parceiro && user.id !== deId) return interaction.reply({ content: 'Este botão não é para você.', ephemeral: true });

      if (acao === 'aceitar') {
        await Casamento.findByIdAndUpdate(dados.casamentoId, { ativo: false, dataFim: new Date() });
        await interaction.update({ embeds: [new EmbedBuilder().setColor(0x888888).setDescription(`💔 <@${deId}> e <@${dados.parceiro}> se divorciaram.`)], components: [] });
        await registrarLog(interaction.client, guild.id, 'divorcio', deId, { descricao: `<@${deId}> e <@${dados.parceiro}> se divorciaram.` }, null);
      } else {
        await interaction.update({ embeds: [new EmbedBuilder().setColor(0x2ecc71).setDescription('❌ Divórcio cancelado.')], components: [] });
      }
      pedidosPendentes.delete(chave);
    }
  });
}
