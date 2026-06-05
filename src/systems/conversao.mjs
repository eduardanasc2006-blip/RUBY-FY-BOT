import { EmbedBuilder } from 'discord.js';
import Config from '../db/models/Config.mjs';
import { isAdmin } from '../utils/permissions.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { registrarLog } from '../utils/logger.mjs';

export const comandos = [
  { cmd: '!robux <qtd>',        desc: 'Converte Robux → BRL.' },
  { cmd: '!brl <valor>',        desc: 'Converte BRL → Robux.' },
  { cmd: '!taxa',               desc: 'Taxa atual de conversão.' },
  { cmd: '!simular <min> <max>',desc: 'Tabela de preços simulados.' },
  { cmd: '!historico',          desc: 'Histórico de alterações de taxa.' },
  { cmd: '!comparar <robux>',   desc: 'Valor bruto em reais.' },
  { cmd: '!meta <atual> <meta>',desc: 'Mostra quanto falta para atingir meta.' },
  { cmd: '!settaxa <valor>',    desc: 'Define taxa (Robux → BRL).' },
];

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();
    const taxa = cfg?.taxa || 38;

    /* =========================
       ROBUX → BRL
    ========================= */
    if (cmd === 'robux') {
      const robux = parseInt(args[0]?.replace(/\D/g, ''));
      if (!robux) return msg.reply({ embeds: [embedErro('Use: `!robux 1000`')] });

      const valor = (robux / 1000) * taxa;

      return msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x00a2ff)
            .setTitle('💰 Conversão Robux → BRL')
            .setDescription(`**${robux.toLocaleString('pt-BR')} Robux**`)
            .addFields(
              { name: '💵 Valor em reais', value: `R$${valor.toFixed(2)}`, inline: true },
              { name: '📊 Taxa atual', value: `1.000 Robux = R$${taxa.toFixed(2)}`, inline: true },
            )
            .setFooter({ text: 'FiskBot • Conversão' })
        ]
      });
    }

    /* =========================
       BRL → ROBUX
    ========================= */
    if (cmd === 'brl') {
      const valor = parseFloat(args[0]?.replace(',', '.'));
      if (!valor) return msg.reply({ embeds: [embedErro('Use: `!brl 10`')] });

      const robux = Math.floor((valor / taxa) * 1000);

      return msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x00a2ff)
            .setTitle('💰 Conversão BRL → Robux')
            .setDescription(`R$${valor.toFixed(2)} = **${robux.toLocaleString('pt-BR')} Robux**`)
        ]
      });
    }

    /* =========================
       TAXA
    ========================= */
    if (cmd === 'taxa') {
      return msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x00a2ff)
            .setTitle('📊 Taxa Atual')
            .setDescription(`1.000 Robux = R$${taxa.toFixed(2)}`)
        ]
      });
    }

    /* =========================
       COMPARAR (SEM TAXAS EXTRAS)
    ========================= */
    if (cmd === 'comparar') {
      const robux = parseInt(args[0]?.replace(/\D/g, ''));
      if (!robux) return msg.reply({ embeds: [embedErro('Use: `!comparar 5000`')] });

      const valor = (robux / 1000) * taxa;

      return msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x00a2ff)
            .setTitle(`💱 Conversão — ${robux.toLocaleString('pt-BR')} Robux`)
            .setDescription('Valor bruto em reais')
            .addFields(
              { name: '💰 Valor', value: `R$${valor.toFixed(2)}`, inline: true },
            )
        ]
      });
    }

    /* =========================
       META (ATUAL → META)
    ========================= */
    if (cmd === 'meta') {
      const atual = parseInt(args[0]?.replace(/\D/g, ''));
      const meta = parseInt(args[1]?.replace(/\D/g, ''));

      if (!atual || !meta) {
        return msg.reply({ embeds: [embedErro('Use: `!meta 300 600`')] });
      }

      const falta = Math.max(meta - atual, 0);
      const valor = (meta / 1000) * taxa;

      return msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x00a2ff)
            .setTitle('🎯 Progresso de Meta')
            .addFields(
              { name: '📦 Atual', value: `${atual.toLocaleString('pt-BR')} Robux`, inline: true },
              { name: '🎯 Meta', value: `${meta.toLocaleString('pt-BR')} Robux`, inline: true },
              { name: '📉 Faltam', value: `${falta.toLocaleString('pt-BR')} Robux`, inline: true },
              { name: '💰 Valor total da meta', value: `R$${valor.toFixed(2)}`, inline: false },
            )
        ]
      });
    }

    /* =========================
       SETTAXA (ROBUX → REAL)
    ========================= */
    if (cmd === 'settaxa') {
      if (!isAdmin(msg.member, cfg)) {
        return msg.reply({ embeds: [embedErro('Sem permissão.')] });
      }

      const novaTaxa = parseFloat(args[0]?.replace(',', '.'));
      if (!novaTaxa) {
        return msg.reply({ embeds: [embedErro('Use: `!settaxa 40`')] });
      }

      await Config.findOneAndUpdate(
        { guildId: msg.guild.id },
        {
          $set: { taxa: novaTaxa },
          $push: {
            taxaHistorico: {
              taxa: novaTaxa,
              adminId: msg.author.id,
              data: new Date()
            }
          }
        },
        { upsert: true }
      );

      if (cfg) cfg.taxa = novaTaxa;

      await registrarLog(
        client,
        msg.guild.id,
        'admin',
        msg.author.id,
        { descricao: `alterou taxa para R$${novaTaxa}` },
        configs
      );

      return msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2ecc71)
            .setDescription(`✅ Taxa atualizada: **1.000 Robux = R$${novaTaxa}**`)
        ]
      });
    }
  });
}
