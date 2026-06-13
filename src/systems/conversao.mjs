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

    const robuxBase = cfg?.robuxBase || 1000;
    const valorBase = cfg?.valorBase || 38;

    // =========================
    // ROBUX -> BRL
    // =========================
    if (cmd === 'robux') {
      const robux = Number(args[0]?.replace(/[\.\s]/g, ''));

      if (Number.isNaN(robux)) {
        return msg.reply({ embeds: [embedErro('Use: `!robux <quantidade>`')] });
      }

      const valorBRL = (robux / robuxBase) * valorBase;
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
            value: `${robuxBase.toLocaleString('pt-BR')} Robux = R$${valorBase.toFixed(2)}`,
            inline: false
          }
        )
        .setFooter({ text: 'Roblox aplica ~30% de taxa em gamepasses' });

      await registrarLog(client, msg.guild.id, 'conversao', msg.author.id, {
        descricao: `Conversão: ${robux} Robux → R$${valorBRL.toFixed(2)}`
      }, configs);

      return msg.reply({ embeds: [embed] });
    }

    // =========================
    // BRL -> ROBUX
    // =========================
    if (cmd === 'brl') {
      const valor = Number(args[0]?.replace(',', '.'));

      if (Number.isNaN(valor)) {
        return msg.reply({ embeds: [embedErro('Use: `!brl <valor>`')] });
      }

      const robux = Math.floor((valor / valorBase) * robuxBase);

      await registrarLog(client, msg.guild.id, 'conversao', msg.author.id, {
        descricao: `Conversão: R$${valor.toFixed(2)} → ${robux} Robux`
      }, configs);

      return msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x00a2ff)
            .setTitle('💰 Conversão BRL → Robux')
            .setDescription(`**R$${valor.toFixed(2)}** = **${robux.toLocaleString('pt-BR')} Robux**`)
        ]
      });
    }

    // =========================
    // TAXA
    // =========================
    if (cmd === 'taxa') {
      return msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x00a2ff)
            .setTitle('📊 Taxa Atual')
            .setDescription(
              `**${robuxBase.toLocaleString('pt-BR')} Robux = R$${valorBase.toFixed(2)}**`
            )
        ]
      });
    }

    // =========================
    // SIMULAR
    // =========================
    if (cmd === 'simular') {
      const v1 = Number(args[0]);
      const v2 = Number(args[1]);

      if (Number.isNaN(v1)) {
        return msg.reply({ embeds: [embedErro('Use: `!simular <min> <max>`')] });
      }

      const min = v1;
      const max = !Number.isNaN(v2) ? v2 : v1 * 10;

      const steps = gerarSteps(min, max);

      const linhas = steps.map(
        r => `**${r.toLocaleString('pt-BR')}** Robux → **R$${((r / robuxBase) * valorBase).toFixed(2)}**`
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

    // =========================
    // META
    // =========================
    if (cmd === 'meta') {
      const saldo = Number(args[0]?.replace(/\D/g, ''));
      const meta = Number(args[1]?.replace(/\D/g, ''));

      if (Number.isNaN(saldo) || Number.isNaN(meta)) {
        return msg.reply({ embeds: [embedErro('Use: `!meta <saldo> <meta>`')] });
      }

      if (saldo >= meta) {
        const excedente = saldo - meta;

        return msg.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x2ecc71)
              .setTitle('🎯 Meta de Robux')
              .setDescription('🎉 Você já atingiu sua meta!')
              .addFields({
                name: '📈 Excedente',
                value: `${excedente} Robux`,
                inline: true
              })
          ]
        });
      }

      const falta = meta - saldo;

      return msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x00a2ff)
            .setTitle('🎯 Meta de Robux')
            .setDescription('📊 Progresso da meta')
            .addFields({
              name: '❌ Falta',
              value: `${falta} Robux`,
              inline: true
            })
        ]
      });
    }

    // =========================
    // SETTAXA
    // =========================
    if (cmd === 'settaxa') {
      if (!isAdmin(msg.member, cfg)) {
        return msg.reply({ embeds: [embedErro('Sem permissão.')] });
      }

      const robux = Number(args[0]);
      const valor = Number(args[1]?.replace(',', '.'));

      if (Number.isNaN(robux) || Number.isNaN(valor)) {
        return msg.reply({
          embeds: [embedErro('Use: `!settaxa <robux> <valor>`')]
        });
      }

      await Config.findOneAndUpdate(
        { guildId: msg.guild.id },
        {
          $set: { robuxBase: robux, valorBase: valor },
          $push: {
            taxaHistorico: {
              robux,
              valor,
              adminId: msg.author.id,
              data: new Date()
            }
          }
        },
        { upsert: true }
      );

      if (cfg) {
        cfg.robuxBase = robux;
        cfg.valorBase = valor;
      }

      await registrarLog(client, msg.guild.id, 'admin', msg.author.id, {
        descricao: `${robux} Robux = R$${valor.toFixed(2)}`
      }, configs);

      return msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('✅ Taxa atualizada')
            .setDescription(`**${robux.toLocaleString('pt-BR')} Robux = R$${valor.toFixed(2)}**`)
        ]
      });
    }
  });
}

// =========================
// HELPERS (fora do register)
// =========================
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
  { cmd: '!robux <quantidade>', desc: 'Converte Robux para reais.' },
  { cmd: '!brl <valor>', desc: 'Converte reais para Robux.' },
  { cmd: '!taxa', desc: 'Mostra a taxa de conversão atual.' },
  { cmd: '!simular <min> <max>', desc: 'Simula valores.' },
  { cmd: '!meta <saldo> <meta>', desc: 'Meta de Robux.' },
  { cmd: '!settaxa <robux> <valor>', desc: 'Define taxa.' }
];
