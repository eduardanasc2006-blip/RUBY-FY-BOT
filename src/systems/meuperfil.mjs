import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import Usuario from '../db/models/Usuario.mjs';
import Conquista from '../db/models/Conquista.mjs';
import { calcularNivel, getFaixa } from '../utils/nivelCalc.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { isDBConnected } from '../utils/dbGuard.mjs';
import { checkCooldown, formatarTempo } from '../utils/cooldown.mjs';

// ── Molduras disponíveis ──────────────────────────────────────
const MOLDURAS = [
  { id: 'padrao',    nome: 'Padrao',     emoji: '⬜', desc: 'Moldura simples padrao' },
  { id: 'bronze',    nome: 'Bronze',     emoji: '🟫', desc: 'Acabamento em bronze' },
  { id: 'prata',     nome: 'Prata',      emoji: '⬜', desc: 'Acabamento em prata' },
  { id: 'ouro',      nome: 'Ouro',       emoji: '🟨', desc: 'Acabamento em ouro' },
  { id: 'diamante',  nome: 'Diamante',   emoji: '🔷', desc: 'Cristal diamante' },
  { id: 'neon_azul', nome: 'Neon Azul',  emoji: '🟦', desc: 'Brilho neon azul' },
  { id: 'neon_roxo', nome: 'Neon Roxo',  emoji: '🟪', desc: 'Brilho neon roxo' },
  { id: 'cosmica',   nome: 'Cosmica',    emoji: '🌌', desc: 'Gradiente cosmico' },
];

const FUNDOS = [
  { id: 'escuro',    nome: 'Escuro',     desc: 'Fundo padrao escuro' },
  { id: 'galaxia',   nome: 'Galaxia',    desc: 'Tons azul-roxo espacial' },
  { id: 'floresta',  nome: 'Floresta',   desc: 'Verde escuro natural' },
  { id: 'oceano',    nome: 'Oceano',     desc: 'Azul profundo' },
  { id: 'pordosol',  nome: 'Por do Sol', desc: 'Laranja e rosa' },
  { id: 'neon',      nome: 'Neon',       desc: 'Luzes neon vibrantes' },
];

const LABEL_GENERO = {
  masculino: 'Masculino',
  feminino:  'Feminino',
  outro:     'Outro',
};

function gerarBarra(atual, total, tamanho = 12) {
  const p = Math.min(1, atual / Math.max(1, total));
  const f = Math.round(p * tamanho);
  return '`' + '█'.repeat(Math.max(0, f)) + '░'.repeat(Math.max(0, tamanho - f)) + '`';
}

function nomeMoldura(id) {
  return MOLDURAS.find(m => m.id === id)?.nome || 'Padrao';
}
function nomeFundo(id) {
  return FUNDOS.find(f => f.id === id)?.nome || 'Escuro';
}

function corMoldura(id) {
  const mapa = {
    padrao:    0x5865f2,
    bronze:    0xcd7f32,
    prata:     0xc0c0c0,
    ouro:      0xffd700,
    diamante:  0xb9f2ff,
    neon_azul: 0x00bfff,
    neon_roxo: 0xa855f7,
    cosmica:   0xff00ff,
  };
  return mapa[id] || 0x5865f2;
}

async function mostrarPerfil(alvo, guildId, guild, replyFn) {
  const [u, conquistas] = await Promise.all([
    Usuario.findOne({ userId: alvo.id, guildId }),
    Conquista.findOne({ userId: alvo.id, guildId }),
  ]);

  const xp      = u?.xp || 0;
  const { nivel, xpAtual, xpProximo } = calcularNivel(xp);
  const faixa   = getFaixa(nivel);
  const barra   = gerarBarra(xpAtual, xpProximo);
  const pct     = Math.round((xpAtual / xpProximo) * 100);
  const moldura = u?.moldura || 'padrao';
  const fundo   = u?.fundo   || 'escuro';
  const genero  = u?.genero  || null;
  const streak  = u?.streak  || 0;

  const embed = new EmbedBuilder()
    .setColor(corMoldura(moldura))
    .setTitle(`Perfil de ${alvo.displayName}`)
    .setThumbnail(alvo.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: 'Nivel', value: `${faixa.emoji} **${nivel}** - ${faixa.nome}`, inline: true },
      { name: 'XP Total', value: `**${xp.toLocaleString('pt-BR')}**`, inline: true },
      { name: 'Reputacao', value: `**${u?.reputacao || 0}**`, inline: true },
      { name: `Progresso (${pct}%)`, value: `${barra}  ${xpAtual} / ${xpProximo}`, inline: false },
      { name: 'Mensagens', value: `**${(u?.mensagens || 0).toLocaleString('pt-BR')}**`, inline: true },
      { name: 'Streak', value: streak > 1 ? `**${streak}** dias seguidos` : '—', inline: true },
      { name: 'Conquistas', value: `**${conquistas?.conquistas?.length || 0}**`, inline: true },
      { name: 'Titulo Equipado', value: u?.tituloEquipado ? `*"${u.tituloEquipado}"*` : '─', inline: false },
      { name: 'Genero', value: genero ? LABEL_GENERO[genero] : 'Nao definido', inline: true },
      { name: 'Moldura', value: nomeMoldura(moldura), inline: true },
      { name: 'Fundo', value: nomeFundo(fundo), inline: true },
    )
    .setFooter({ text: `${guild.name} | Use os botoes abaixo para personalizar` })
    .setTimestamp();

  // Botoes de personalizacao
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`perfil:moldura:${alvo.id}:${guildId}`)
      .setLabel('Alterar Moldura')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🖼️'),
    new ButtonBuilder()
      .setCustomId(`perfil:fundo:${alvo.id}:${guildId}`)
      .setLabel('Alterar Fundo')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🌌'),
    new ButtonBuilder()
      .setCustomId(`perfil:titulos:${alvo.id}:${guildId}`)
      .setLabel('Alterar Titulo')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📜'),
    new ButtonBuilder()
      .setCustomId(`perfil:genero:${alvo.id}:${guildId}`)
      .setLabel('Definir Genero')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('👤'),
  );

  return replyFn({ embeds: [embed], components: [row] });
}

export function register(client, configs) {
  // ── Comando !meuperfil ──────────────────────────────────────
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    const cfg     = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args  = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd   = args.shift().toLowerCase();
    const guildId = msg.guild.id;

    if (cmd !== 'meuperfil' && cmd !== 'perfil') return;

    if (!isDBConnected())
      return msg.reply({ embeds: [embedErro('Banco de dados nao disponivel.')] });

    const cdKey = `meuperfil:${msg.author.id}:${guildId}`;
    const espera = checkCooldown(cdKey, 8_000);
    if (espera)
      return msg.reply({ embeds: [embedErro(`Aguarde **${formatarTempo(espera)}** para ver o perfil novamente.`)] });

    const alvo = msg.mentions.users.first() || msg.author;

    await mostrarPerfil(alvo, guildId, msg.guild, (opts) => msg.reply(opts));
  });

  // ── Interações (botões e menus) ──────────────────────────────
  client.on('interactionCreate', async (interaction) => {
    // ── Botões de perfil ──
    if (interaction.isButton() && interaction.customId.startsWith('perfil:')) {
      const [, tipo, userId, guildId] = interaction.customId.split(':');

      if (interaction.user.id !== userId)
        return interaction.reply({ content: 'Esses botoes nao sao seus.', ephemeral: true });

      if (tipo === 'moldura') {
        const opcoes = MOLDURAS.map(m =>
          new StringSelectMenuOptionBuilder()
            .setLabel(m.nome)
            .setValue(m.id)
            .setDescription(m.desc)
        );
        const menu = new StringSelectMenuBuilder()
          .setCustomId(`perfilsel:moldura:${userId}:${guildId}`)
          .setPlaceholder('Escolha uma moldura...')
          .addOptions(opcoes);
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('Escolha sua Moldura').setDescription(
            MOLDURAS.map(m => `**${m.nome}** — ${m.desc}`).join('\n')
          )],
          components: [new ActionRowBuilder().addComponents(menu)],
          ephemeral: true,
        });
      }

      if (tipo === 'fundo') {
        const opcoes = FUNDOS.map(f =>
          new StringSelectMenuOptionBuilder()
            .setLabel(f.nome)
            .setValue(f.id)
            .setDescription(f.desc)
        );
        const menu = new StringSelectMenuBuilder()
          .setCustomId(`perfilsel:fundo:${userId}:${guildId}`)
          .setPlaceholder('Escolha um fundo...')
          .addOptions(opcoes);
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('Escolha seu Fundo')],
          components: [new ActionRowBuilder().addComponents(menu)],
          ephemeral: true,
        });
      }

      if (tipo === 'titulos') {
        const u = await Usuario.findOne({ userId, guildId });
        const titulos = u?.titulos || [];
        if (!titulos.length) {
          return interaction.reply({
            content: 'Voce nao tem titulos desbloqueados. Ganhe conquistas para obter titulos!',
            ephemeral: true,
          });
        }
        const opcoes = titulos.slice(0, 25).map(t =>
          new StringSelectMenuOptionBuilder().setLabel(t).setValue(t).setDescription(`Equipar: "${t}"`)
        );
        opcoes.unshift(
          new StringSelectMenuOptionBuilder().setLabel('(Remover Titulo)').setValue('__remover__').setDescription('Remove o titulo equipado')
        );
        const menu = new StringSelectMenuBuilder()
          .setCustomId(`perfilsel:titulo:${userId}:${guildId}`)
          .setPlaceholder('Escolha um titulo...')
          .addOptions(opcoes);
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('Seus Titulos').setDescription(titulos.join('\n'))],
          components: [new ActionRowBuilder().addComponents(menu)],
          ephemeral: true,
        });
      }

      if (tipo === 'genero') {
        const opcoes = [
          new StringSelectMenuOptionBuilder().setLabel('Masculino').setValue('masculino').setDescription('Define genero masculino').setEmoji('🔵'),
          new StringSelectMenuOptionBuilder().setLabel('Feminino').setValue('feminino').setDescription('Define genero feminino').setEmoji('🔴'),
          new StringSelectMenuOptionBuilder().setLabel('Outro').setValue('outro').setDescription('Outro genero').setEmoji('🟣'),
          new StringSelectMenuOptionBuilder().setLabel('Remover').setValue('__remover__').setDescription('Remove o genero definido'),
        ];
        const menu = new StringSelectMenuBuilder()
          .setCustomId(`perfilsel:genero:${userId}:${guildId}`)
          .setPlaceholder('Escolha...')
          .addOptions(opcoes);
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('Definir Genero').setDescription('Isso afeta as cores do !ship.')],
          components: [new ActionRowBuilder().addComponents(menu)],
          ephemeral: true,
        });
      }
    }

    // ── Select menus de perfil ──
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('perfilsel:')) {
      const [, tipo, userId, guildId] = interaction.customId.split(':');

      if (interaction.user.id !== userId)
        return interaction.reply({ content: 'Este menu nao e seu.', ephemeral: true });

      const valor = interaction.values[0];

      if (tipo === 'moldura') {
        await Usuario.findOneAndUpdate(
          { userId, guildId },
          { $set: { moldura: valor }, $setOnInsert: { userId, guildId } },
          { upsert: true }
        );
        await interaction.update({
          embeds: [new EmbedBuilder().setColor(corMoldura(valor)).setDescription(`Moldura alterada para **${nomeMoldura(valor)}** com sucesso!`)],
          components: [],
        });
      }

      if (tipo === 'fundo') {
        await Usuario.findOneAndUpdate(
          { userId, guildId },
          { $set: { fundo: valor }, $setOnInsert: { userId, guildId } },
          { upsert: true }
        );
        await interaction.update({
          embeds: [new EmbedBuilder().setColor(0x2ecc71).setDescription(`Fundo alterado para **${nomeFundo(valor)}** com sucesso!`)],
          components: [],
        });
      }

      if (tipo === 'titulo') {
        const novoTitulo = valor === '__remover__' ? null : valor;
        await Usuario.findOneAndUpdate(
          { userId, guildId },
          { $set: { tituloEquipado: novoTitulo }, $setOnInsert: { userId, guildId } },
          { upsert: true }
        );
        await interaction.update({
          embeds: [new EmbedBuilder().setColor(0x2ecc71).setDescription(
            novoTitulo ? `Titulo **"${novoTitulo}"** equipado!` : 'Titulo removido.'
          )],
          components: [],
        });
      }

      if (tipo === 'genero') {
        const novoGenero = valor === '__remover__' ? null : valor;
        await Usuario.findOneAndUpdate(
          { userId, guildId },
          { $set: { genero: novoGenero }, $setOnInsert: { userId, guildId } },
          { upsert: true }
        );
        await interaction.update({
          embeds: [new EmbedBuilder().setColor(0x2ecc71).setDescription(
            novoGenero ? `Genero definido como **${LABEL_GENERO[novoGenero]}**.` : 'Genero removido.'
          )],
          components: [],
        });
      }
    }
  });
}
