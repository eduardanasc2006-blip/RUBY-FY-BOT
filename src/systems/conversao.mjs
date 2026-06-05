import { EmbedBuilder } from 'discord.js';
import Config from '../db/models/Config.mjs';
import { isAdmin } from '../utils/permissions.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { registrarLog } from '../utils/logger.mjs';

export const comandos = [
  { cmd: '!robux <qtd>',        desc: 'Converte Robux → BRL + cálculo de Gamepass.' },
  { cmd: '!brl <valor>',        desc: 'Converte BRL → Robux.' },
  { cmd: '!taxa',               desc: 'Taxa atual de conversão.' },
  { cmd: '!simular <min> <max>',desc: 'Tabela de preços simulados.' },
  { cmd: '!historico',          desc: 'Histórico de alterações de taxa.' },
  { cmd: '!comparar <robux>',   desc: 'Valor bruto vs líquido (taxa 10%).' },
  { cmd: '!meta <robux>',       desc: 'Calculadora de meta em Robux.' },
  { cmd: '!settaxa <valor>',    desc: 'Alterar taxa (admin).' },
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

    if (cmd === 'robux') {
      const robux = parseInt(args[0]?.replace(/[\.\s]/g, ''));
      if (!robux || isNaN(robux)) return msg.reply({ embeds: [embedErro('Use: `!robux <quantidade de robux>`\nExemplo: `!robux 1000`')] });
      const valor    = (robux / 1000) * taxa;
      // Gamepass: para RECEBER X robux o vendedor precisa colocar X / 0.70 (Roblox retém 30%)
      const gamepass = Math.ceil(robux / 0.70);
      const embed = new EmbedBuilder()
        .setColor(0x00a2ff)
        .setTitle('💰 Conversão Robux → BRL')
        .setDescription(`**${robux.toLocaleString('pt-BR')} Robux**`)
        .addFields(
          { name: '💵 Valor em reais', value: `**R$${valor.toFixed(2)}**`, inline: true },
          { name: '🎟️ Valor da Gamepass', value: `**${gamepass.toLocaleString('pt-BR')} Robux**`, inline: true },
          { name: '📊 Taxa Roblox (Gamepass)', value: '30% retido pelo Roblox', inline: false },
          { name: '📊 Taxa atual', value: `1.000 Robux = R$${taxa.toFixed(2)}`, inline: true },
        )
        .addFields({ name: '\u200b', value: `💡 *Para RECEBER ${robux.toLocaleString('pt-BR')} Robux via Gamepass, crie uma de **${gamepass.toLocaleString('pt-BR')} Robux** (o Roblox fica com 30%)*` })
        .setFooter({ text: 'FiskBot • Conversão' })
        .setTimestamp();
      return msg.reply({ embeds: [embed] });
    }

    if (cmd === 'brl') {
      const valor = parseFloat(args[0]?.replace(',', '.'));
      if (!valor || isNaN(valor)) return msg.reply({ embeds: [embedErro('Use: `!brl <valor em reais>`\nExemplo: `!brl 10`')] });
      const robux = Math.floor((valor / taxa) * 1000);
      const embed = new EmbedBuilder()
        .setColor(0x00a2ff)
        .setTitle('💰 Conversão BRL → Robux')
        .setDescription(`**R$${valor.toFixed(2)}** = **${robux.toLocaleString('pt-BR')} Robux**`)
        .addFields({ name: '📊 Taxa atual', value: `1.000 Robux = R$${taxa.toFixed(2)}`, inline: true })
        .setFooter({ text: 'FiskBot • Conversão' })
        .setTimestamp();
      return msg.reply({ embeds: [embed] });
    }

    if (cmd === 'taxa') {
      const embed = new EmbedBuilder()
        .setColor(0x00a2ff)
        .setTitle('📊 Taxa Atual')
        .setDescription(`**1.000 Robux = R$${taxa.toFixed(2)}**`)
        .setFooter({ text: 'FiskBot • Use !settaxa <valor> para alterar' })
        .setTimestamp();
      return msg.reply({ embeds: [embed] });
    }

    if (cmd === 'simular') {
      const v1 = parseInt(args[0]?.replace(/\D/g, ''));
      const v2 = parseInt(args[1]?.replace(/\D/g, ''));

      if (!v1 || isNaN(v1)) return msg.reply({ embeds: [embedErro('Use: `!simular <min> <max>`\nExemplo: `!simular 1000 10000`')] });

      const min = v1;
      const max = v2 && !isNaN(v2) ? v2 : v1 * 10;

      const steps = gerarSteps(min, max);
      const linhas = steps.map(r =>
        `**${r.toLocaleString('pt-BR')}** Robux ➜ **R$${((r / 1000) * taxa).toFixed(2)}**`
      );

      const embed = new EmbedBuilder()
        .setColor(0x00a2ff)
        .setTitle('📋 Tabela de Preços')
        .setDescription(linhas.join('\n'))
        .addFields({ name: '📊 Taxa', value: `1.000 Robux = R$${taxa.toFixed(2)}`, inline: true })
        .setFooter({ text: 'FiskBot • Simulação' })
        .setTimestamp();
      return msg.reply({ embeds: [embed] });
    }

    if (cmd === 'historico') {
      const dbCfg = await Config.findOne({ guildId: msg.guild.id });
      const hist = dbCfg?.taxaHistorico?.slice(-10).reverse() || [];
      if (!hist.length) return msg.reply({ embeds: [embedErro('Nenhuma alteração registrada ainda.')] });
      const linhas = hist.map(h => {
        const data = new Date(h.data).toLocaleDateString('pt-BR');
        return `📅 **${data}** — R$${h.taxa.toFixed(2)}/1k • <@${h.adminId}>`;
      });
      const embed = new EmbedBuilder().setColor(0x00a2ff).setTitle('📜 Histórico de Taxa').setDescription(linhas.join('\n')).setTimestamp();
      return msg.reply({ embeds: [embed] });
    }

    if (cmd === 'comparar') {
      const robux = parseInt(args[0]?.replace(/\D/g, ''));
      if (!robux || isNaN(robux)) return msg.reply({ embeds: [embedErro('Use: `!comparar <robux>`\nExemplo: `!comparar 5000`')] });
      const bruto = (robux / 1000) * taxa;
      const taxaPlat = bruto * 0.1;
      const liquido = bruto - taxaPlat;
      const embed = new EmbedBuilder()
        .setColor(0x00a2ff)
        .setTitle(`💱 Comparação — ${robux.toLocaleString('pt-BR')} Robux`)
        .setDescription('Valor com e sem a taxa da plataforma (10%)')
        .addFields(
          { name: '💰 Valor Bruto', value: `R$${bruto.toFixed(2)}`, inline: true },
          { name: '📉 Taxa Plataforma (10%)', value: `R$${taxaPlat.toFixed(2)}`, inline: true },
          { name: '✅ Valor Líquido', value: `R$${liquido.toFixed(2)}`, inline: true },
        ).setTimestamp();
      return msg.reply({ embeds: [embed] });
    }

    if (cmd === 'meta') {
      const robux = parseInt(args[0]?.replace(/\D/g, ''));
      if (!robux || isNaN(robux)) return msg.reply({ embeds: [embedErro('Use: `!meta <robux>`\nExemplo: `!meta 10000`\nCalcula quanto em R$ você precisa juntar para atingir essa quantidade de Robux.')] });
      const necessario = (robux / 1000) * taxa;
      const diario30 = necessario / 30;
      const diario7 = necessario / 7;
      const embed = new EmbedBuilder()
        .setColor(0x00a2ff)
        .setTitle('🎯 Calculadora de Meta')
        .setDescription(`Para conseguir **${robux.toLocaleString('pt-BR')} Robux** você precisa de:`)
        .addFields(
          { name: '💰 Total necessário', value: `**R$${necessario.toFixed(2)}**`, inline: false },
          { name: '📅 Economizando por dia (30 dias)', value: `R$${diario30.toFixed(2)}/dia`, inline: true },
          { name: '📅 Economizando por dia (7 dias)', value: `R$${diario7.toFixed(2)}/dia`, inline: true },
          { name: '📊 Taxa atual', value: `1.000 Robux = R$${taxa.toFixed(2)}`, inline: false },
        ).setTimestamp();
      return msg.reply({ embeds: [embed] });
    }

    if (cmd === 'settaxa') {
      if (!isAdmin(msg.member, cfg)) return msg.reply({ embeds: [embedErro('Sem permissão.')] });
      const novatTaxa = parseFloat(args[0]?.replace(',', '.'));
      if (!novatTaxa || isNaN(novatTaxa)) return msg.reply({ embeds: [embedErro('Use: `!settaxa <valor>`\nExemplo: `!settaxa 40.50`')] });
      await Config.findOneAndUpdate(
        { guildId: msg.guild.id },
        { $set: { taxa: novatTaxa }, $push: { taxaHistorico: { taxa: novatTaxa, adminId: msg.author.id, data: new Date() } } },
        { upsert: true }
      );
      if (cfg) cfg.taxa = novatTaxa;
      await registrarLog(client, msg.guild.id, 'admin', msg.author.id, { descricao: `<@${msg.author.id}> alterou a taxa para R$${novatTaxa.toFixed(2)}` }, configs);
      return msg.reply({ embeds: [new EmbedBuilder().setColor(0x2ecc71).setDescription(`✅ Taxa atualizada para **R$${novatTaxa.toFixed(2)}** por 1.000 Robux.`)] });
    }
  });
}

function gerarSteps(min, max) {
  if (min === max) {
    const arr = [];
    for (let i = 1; i <= 8; i++) arr.push(min * i);
    return arr.slice(0, 8);
  }

  const predefinidos = [100, 250, 500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 25000, 50000, 75000, 100000];
  const porFiltro = predefinidos.filter(p => p >= min && p <= max);

  if (porFiltro.length >= 3) return porFiltro.slice(0, 10);

  const qtd = 8;
  const step = Math.ceil((max - min) / (qtd - 1));
  const resultado = [];
  for (let i = 0; i < qtd; i++) {
    const val = min + step * i;
    if (val <= max) resultado.push(val);
  }
  if (!resultado.includes(max)) resultado.push(max);
  return [...new Set(resultado)].slice(0, 10);
}
