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
      const valorBRL = (robux / robuxBase) * valorBase;

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
            value: `${robuxBase.toLocaleString('pt-BR')} Robux = R$${valorBase.toFixed(2)}`,
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

      const robux = Math.floor((valor / valorBase) * robuxBase);
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
           .setDescription(
  `**${robuxBase.toLocaleString('pt-BR')} Robux = R$${valorBase.toFixed(2)}**`
)
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
        `**${r.toLocaleString('pt-BR')}** Robux → **R$${((r / robuxBase) * valorBase).toFixed(2)}**`
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

     const valorSaldo = (saldo / robuxBase) * valorBase;
const valorMeta = (meta / robuxBase) * valorBase;

      let embed = new EmbedBuilder()
        .setColor(0x00a2ff)
        .setTitle('🎯 Meta de Robux');

      if (saldo >= meta) {
        const excedenteRobux = saldo - meta;
        const excedenteValor = (excedenteRobux / robuxBase) * valorBase;

        embed.setDescription('🎉 Você já atingiu sua meta!')
          .addFields(
            { name: '📌 Meta', value: `${meta} Robux`, inline: true },
            { name: '💰 Saldo', value: `${saldo} Robux`, inline: true },
            { name: '📈 Excedente', value: `+${excedenteRobux} Robux`, inline: true },
            { name: '💵 Valor extra', value: `R$${excedenteValor.toFixed(2)}`, inline: true }
          );
      } else {
        const faltaRobux = meta - saldo;
        const faltaValor = (faltaRobux / robuxBase) * valorBase;

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
    return msg.reply({
      embeds: [embedErro('Sem permissão.')]
    });
  }

  const robux = parseInt(args[0]);
  const valor = parseFloat(args[1]?.replace(',', '.'));

  if (
    !robux ||
    isNaN(robux) ||
    !valor ||
    isNaN(valor)
  ) {
    return msg.reply({
      embeds: [
        embedErro(
          'Use: `!settaxa <robux> <valor>`\nExemplo: `!settaxa 100 3,80`'
        )
      ]
    });
  }

  await Config.findOneAndUpdate(
    { guildId: msg.guild.id },
    {
      $set: {
        robuxBase: robux,
        valorBase: valor
      },
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

  await registrarLog(
    client,
    msg.guild.id,
    'admin',
    msg.author.id,
    {
      descricao: `${robux} Robux = R$${valor.toFixed(2)}`
    },
    configs
  );

  return msg.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ Taxa atualizada')
        .setDescription(
          `**${robux.toLocaleString('pt-BR')} Robux = R$${valor.toFixed(2)}**`
        )
    ]
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
    { cmd: '!robux <quantidade>', desc: 'Converte Robux para reais.' },
{ cmd: '!brl <valor>', desc: 'Converte reais para Robux.' },
    { cmd: '!taxa',              desc: 'Mostra a taxa de conversão atual.' },
    { cmd: '!simular <brl>',     desc: 'Simula uma venda de Robux.' },
    { cmd: '!meta <brl>',        desc: 'Mostra quanto Robux precisa para uma meta em BRL.' },
    { cmd: '!settaxa <robux> <valor>', desc: 'Define a equivalência Robux → Reais.' },
  ];
