import { EmbedBuilder } from 'discord.js';
import Config from '../db/models/Config.mjs';
import { isAdmin } from '../utils/permissions.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { registrarLog } from '../utils/logger.mjs';

export function register(client, configs) {
  if (client.__conversaoRegistrado) return;
  client.__conversaoRegistrado = true;
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    const taxa = cfg?.taxa || 38;

    /* =========================
      ROBUX -> BRL (ATUALIZADO)
    ========================= */
    if (cmd === 'robux') {
      const robux = parseInt(args[0]?.replace(/[\.\s]/g, ''));

      if (!robux || isNaN(robux)) {
        return msg.reply({
          embeds: [embedErro('Use: `!robux <quantidade>`')]
        });
      }

      // 💰 valor em reais
      const valorBRL = (robux / 1000) * taxa;

      // 🎮 gamepass (Roblox retém 30%)
      const valorGamepass = Math.ceil(robux / 0.7);

      const embed = new EmbedBuilder()
        .setColor(0x00a2ff)
        .setTitle('💰 Conversão Robux → BRL')
        .setDescription(`**${robux.toLocaleString('pt-BR')} Robux**`)

        .addFields(
          {
            name: '💵 Valor em reais',
            value: `R$ ${valorBRL.toFixed(2)}`,
            inline: true
          },
          {
            name: '🎮 Gamepass necessária',
            value: `${valorGamepass.toLocaleString('pt-BR')} Robux`,
            inline: true
          },
          {
            name: '📊 Taxa base',
            value: `1.000 Robux = R$${taxa.toFixed(2)}`,
            inline: false
          }
        )

        .setFooter({
          text: 'Roblox aplica ~30% de taxa em gamepasses'
        });

      // 📊 LOG COMPLETO
      await registrarLog(
        client,
        msg.guild.id,
        'conversao',
        msg.author.id,
        {
          descricao: `Conversão: ${robux} Robux → R$${valorBRL.toFixed(2)} | Gamepass: ${valorGamepass}`,
        },
        configs
      );

      return msg.reply({ embeds: [embed] });
    }

    /* =========================
      BRL -> ROBUX
    ========================= */
    if (cmd === 'brl') {
      const valor = parseFloat(args[0]?.replace(',', '.'));

      if (!valor || isNaN(valor)) {
        return msg.reply({
          embeds: [embedErro('Use: `!brl <valor>`')]
        });
      }

      const robux = Math.floor((valor / taxa) * 1000);

      await registrarLog(
        client,
        msg.guild.id,
        'conversao',
        msg.author.id,
        {
          descricao: `Conversão: R$${valor.toFixed(2)} → ${robux} Robux`,
        },
        configs
      );

      return msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x00a2ff)
            .setTitle('💰 Conversão BRL → Robux')
            .setDescription(`**R$${valor.toFixed(2)}** = **${robux.toLocaleString('pt-BR')} Robux**`)
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
            .setDescription(`**1.000 Robux = R$${taxa.toFixed(2)}**`)
        ]
      });
    }

    /* =========================
      SIMULAR
    ========================= */
    if (cmd === 'simular') {
      const v1 = parseInt(args[0]);
      const v2 = parseInt(args[1]);

      if (!v1 || isNaN(v1)) {
        return msg.reply({
          embeds: [embedErro('Use: `!simular <min> <max>`')]
        });
      }

      const min = v1;
      const max = v2 && !isNaN(v2) ? v2 : v1 * 10;

      const steps = gerarSteps(min, max);

      const linhas = steps.map(r =>
        `**${r.toLocaleString('pt-BR')}** Robux → **R$${((r / 1000) * taxa).toFixed(2)}**`
      );

      return msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x00a2ff)
            .setTitle('📋 Simulação')
            .setDescription(linhas.join('\n'))
        ]
      });
    }

    /* =========================
      META
    ========================= */
    if (cmd === 'meta') {
      const saldo = parseInt(args[0]?.replace(/\D/g, ''));
      const meta = parseInt(args[1]?.replace(/\D/g, ''));

      if (!saldo || !meta || isNaN(saldo) || isNaN(meta)) {
        return msg.reply({
          embeds: [embedErro('Use: `!meta <saldo> <meta>`')]
        });
      }

      const valorSaldo = (saldo / 1000) * taxa;
      const valorMeta = (meta / 1000) * taxa;

      let embed = new EmbedBuilder()
        .setColor(0x00a2ff)
        .setTitle('🎯 Meta de Robux');

      if (saldo >= meta) {
        const excedenteRobux = saldo - meta;
        const excedenteValor = (excedenteRobux / 1000) * taxa;

        embed.setDescription('🎉 Você já atingiu sua meta!')
          .addFields(
            { name: '📌 Meta', value: `${meta} Robux`, inline: true },
            { name: '💰 Saldo', value: `${saldo} Robux`, inline: true },
            { name: '📈 Excedente', value: `+${excedenteRobux} Robux`, inline: true },
            { name: '💵 Valor extra', value: `R$${excedenteValor.toFixed(2)}`, inline: true }
          );
      } else {
        const faltaRobux = meta - saldo;
        const faltaValor = (faltaRobux / 1000) * taxa;

        embed.setDescription('📊 Progresso da meta')
          .addFields(
            { name: '🎯 Meta', value: `${meta} Robux`, inline: true },
            { name: '💰 Saldo', value: `${saldo} Robux`, inline: true },
            { name: '❌ Falta', value: `${faltaRobux} Robux`, inline: true },
            { name: '💵 Valor faltando', value: `R$${faltaValor.toFixed(2)}`, inline: true }
          );
      }

      return msg.reply({ embeds: [embed] });
    }

    /* =========================
      SET TAXA
    ========================= */
    if (cmd === 'settaxa') {
      if (!isAdmin(msg.member, cfg)) {
        return msg.reply({ embeds: [embedErro('Sem permissão.')] });
      }

      const nova = parseFloat(args[0]?.replace(',', '.'));

      if (!nova || isNaN(nova)) {
        return msg.reply({
          embeds: [embedErro('Use: `!settaxa <valor>`')]
        });
      }

      await Config.findOneAndUpdate(
        { guildId: msg.guild.id },
        {
          $set: { taxa: nova },
          $push: {
            taxaHistorico: {
              taxa: nova,
              adminId: msg.author.id,
              data: new Date()
            }
          }
        },
        { upsert: true }
      );

      if (cfg) cfg.taxa = nova;

      await registrarLog(
        client,
        msg.guild.id,
        'admin',
        msg.author.id,
        {
          descricao: `Taxa alterada para R$${nova.toFixed(2)}`
        },
        configs
      );

      return msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2ecc71)
            .setDescription(`✅ Taxa atualizada para **R$${nova.toFixed(2)}**`)
        ]
      });
    }
  });
}

/* =========================
  HELPERS
========================= */
function gerarSteps(min, max) {
  const qtd = 8;
  const step = Math.ceil((max - min) / (qtd - 1));
  const res = [];

  for (let i = 0; i < qtd; i++) {
    const v = min + step * i;
    if (v <= max) res.push(v);
  }

  if (!res.includes(max)) res.push(max);

  return [...new Set(res)].slice(0, 10);
        }

  export const comandos = [
    { cmd: '!robux <brl>',       desc: 'Converte BRL para Robux com a taxa atual.' },
    { cmd: '!brl <robux>',       desc: 'Converte Robux para BRL.' },
    { cmd: '!taxa',              desc: 'Mostra a taxa de conversão atual.' },
    { cmd: '!simular <brl>',     desc: 'Simula uma venda de Robux.' },
    { cmd: '!meta <brl>',        desc: 'Mostra quanto Robux precisa para uma meta em BRL.' },
    { cmd: '!settaxa <valor>',   desc: 'Define a taxa de conversão (admin).' },
  ];
