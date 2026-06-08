import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import QuizModel from '../db/models/Quiz.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { checkCooldown, formatarTempo } from '../utils/cooldown.mjs';
import { progredirMissao } from './missoes.mjs';
import { ganharXP, XP_EVENTS } from './xpSystem.mjs';

const PERGUNTAS = {
  roblox: [
    { p: 'Em que ano o Roblox foi lançado ao público?', ops: ['2004', '2006', '2008', '2010'], r: 1 },
    { p: 'Qual é a moeda principal do Roblox?', ops: ['Tix', 'Robux', 'Gold', 'Coins'], r: 1 },
    { p: 'Quem criou o Roblox?', ops: ['David Baszucki', 'Mark Zuckerberg', 'Notch', 'Erik Cassel'], r: 0 },
    { p: 'O que significa "R$" no Roblox?', ops: ['Real', 'Robux', 'Reward', 'Rank'], r: 1 },
    { p: 'Qual é o nome do personagem padrão do Roblox?', ops: ['Noob', 'Guest', 'Robloxian', 'Builder'], r: 2 },
    { p: 'Qual game do Roblox foi o mais jogado em 2023?', ops: ['Adopt Me!', 'Brookhaven', 'Blox Fruits', 'Jailbreak'], r: 2 },
    { p: 'Qual era o nome antigo da moeda gratuita do Roblox?', ops: ['Bucks', 'Tix', 'Coins', 'Stars'], r: 1 },
    { p: 'Em que plataforma o Roblox NÃO está disponível?', ops: ['iOS', 'Android', 'Nintendo Switch', 'Xbox'], r: 2 },
  ],
  anime: [
    { p: 'Qual é o personagem principal de Naruto?', ops: ['Sasuke', 'Naruto Uzumaki', 'Itachi', 'Kakashi'], r: 1 },
    { p: 'Em One Piece, qual é o sonho de Luffy?', ops: ['Ser o mais forte', 'Encontrar One Piece', 'Salvar Ace', 'Ser Rei dos Piratas'], r: 3 },
    { p: 'Qual anime tem o personagem Goku?', ops: ['Naruto', 'Dragon Ball', 'Bleach', 'One Piece'], r: 1 },
    { p: 'Em qual anime aparece o Titan Colossal?', ops: ['Sword Art Online', 'Attack on Titan', 'Demon Slayer', 'My Hero Academia'], r: 1 },
    { p: 'Qual é o poder do Deku em My Hero Academia?', ops: ['Sharingan', 'One For All', 'Haki', 'Quirk Fire'], r: 1 },
    { p: 'Quantos membros tem o grupo Akatsuki em Naruto?', ops: ['8', '9', '10', '12'], r: 2 },
    { p: 'Em Demon Slayer, qual é a respiração usada por Tanjiro?', ops: ['Respiração do Trovão', 'Respiração da Água', 'Respiração do Sol', 'Respiração do Fogo'], r: 1 },
    { p: 'Qual personagem de Attack on Titan tem os poderes do Titã Fundador?', ops: ['Levi', 'Mikasa', 'Armin', 'Eren'], r: 3 },
  ],
  matematica: [
    { p: 'Quanto é 15 × 15?', ops: ['200', '220', '225', '230'], r: 2 },
    { p: 'Qual é a raiz quadrada de 144?', ops: ['10', '11', '12', '13'], r: 2 },
    { p: 'Quanto é 2⁸?', ops: ['128', '256', '512', '64'], r: 1 },
    { p: 'Qual é o valor de π (pi) aproximado?', ops: ['3.14', '3.16', '3.12', '3.18'], r: 0 },
    { p: '10% de 250 é:', ops: ['20', '25', '30', '35'], r: 1 },
    { p: 'Qual é o resultado de 7² + 7?', ops: ['49', '56', '42', '63'], r: 1 },
    { p: 'Quanto é 1000 ÷ 8?', ops: ['115', '120', '125', '130'], r: 2 },
    { p: 'Se x = 5, quanto vale 3x² - 2x + 1?', ops: ['64', '66', '68', '70'], r: 1 },
  ],
  tecnologia: [
    { p: 'O que significa "CPU"?', ops: ['Central Processing Unit', 'Computer Power Unit', 'Core Processing Unit', 'Central Power Unit'], r: 0 },
    { p: 'Qual linguagem criou a World Wide Web?', ops: ['Python', 'HTML', 'C++', 'Java'], r: 1 },
    { p: 'Quem fundou a Microsoft?', ops: ['Steve Jobs', 'Elon Musk', 'Bill Gates', 'Larry Page'], r: 2 },
    { p: 'O que é RAM?', ops: ['Read Access Memory', 'Random Access Memory', 'Rapid Access Module', 'Root Access Memory'], r: 1 },
    { p: 'Em que ano foi criado o Python?', ops: ['1985', '1989', '1991', '1995'], r: 2 },
    { p: 'O que significa "HTTP"?', ops: ['HyperText Transmission Protocol', 'HyperText Transfer Protocol', 'High Text Transfer Protocol', 'Home Transfer Text Protocol'], r: 1 },
    { p: 'Quantos bits tem 1 byte?', ops: ['4', '8', '16', '32'], r: 1 },
    { p: 'Qual empresa criou o Android?', ops: ['Apple', 'Microsoft', 'Google', 'Samsung'], r: 2 },
  ],
  historia: [
    { p: 'Em que ano o Brasil se tornou independente?', ops: ['1820', '1822', '1825', '1830'], r: 1 },
    { p: 'Quem foi o primeiro presidente do Brasil?', ops: ['Dom Pedro II', 'Getúlio Vargas', 'Deodoro da Fonseca', 'Floriano Peixoto'], r: 2 },
    { p: 'Em que ano ocorreu a Segunda Guerra Mundial?', ops: ['1935-1942', '1939-1945', '1941-1946', '1938-1944'], r: 1 },
    { p: 'Quem descobriu o Brasil?', ops: ['Cristóvão Colombo', 'Vasco da Gama', 'Pedro Álvares Cabral', 'Fernão de Magalhães'], r: 2 },
    { p: 'Em que ano o homem chegou à Lua?', ops: ['1965', '1967', '1969', '1971'], r: 2 },
    { p: 'Quem foi o último imperador do Brasil?', ops: ['Dom Pedro I', 'Dom João VI', 'Dom Pedro II', 'Dom Afonso'], r: 2 },
    { p: 'Em que ano caiu o Muro de Berlim?', ops: ['1985', '1987', '1989', '1991'], r: 2 },
    { p: 'Qual civilização construiu o Coliseu de Roma?', ops: ['Grega', 'Romana', 'Egípcia', 'Persa'], r: 1 },
  ],
};

const TODAS_CATS = Object.keys(PERGUNTAS);
const LETRAS     = ['A', 'B', 'C', 'D'];

// Chave do jogo = canal + guild — qualquer pessoa no canal pode responder
const jogosAtivos = new Map();

function sortearPergunta(categoria) {
  if (categoria === 'geral') {
    const cat  = TODAS_CATS[Math.floor(Math.random() * TODAS_CATS.length)];
    const pergs = PERGUNTAS[cat];
    return { pergunta: pergs[Math.floor(Math.random() * pergs.length)], categoria: cat };
  }
  const pergs = PERGUNTAS[categoria] || PERGUNTAS[TODAS_CATS[0]];
  return { pergunta: pergs[Math.floor(Math.random() * pergs.length)], categoria };
}

async function iniciarQuiz(channel, iniciadorId, guildId, categoria) {
  const chave = `${channel.id}:${guildId}`;
  if (jogosAtivos.has(chave)) {
    await channel.send({ embeds: [embedErro('Já há um quiz em andamento neste canal! Responda com **A**, **B**, **C** ou **D**.')] });
    return;
  }

  const { pergunta, categoria: catReal } = sortearPergunta(categoria);
  const catLabel = catReal.charAt(0).toUpperCase() + catReal.slice(1);

  // Lista as opções no texto do embed — sem botões
  const opcoesTxt = pergunta.ops
    .map((op, i) => `${LETRAS[i]}) ${op}`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`🧠 Quiz — ${catLabel}`)
    .setDescription(`**${pergunta.p}**\n\n${opcoesTxt}`)
    .setFooter({ text: `Iniciado por <@${iniciadorId}> • Qualquer um pode responder! Digite A, B, C ou D no chat.` })
    .setTimestamp();

  await channel.send({ embeds: [embed] });

  // Timer de 30 segundos
  const timer = setTimeout(async () => {
    if (!jogosAtivos.has(chave)) return;
    const j = jogosAtivos.get(chave);
    jogosAtivos.delete(chave);
    const certa = `${LETRAS[j.correto]}) ${j.pergunta.ops[j.correto]}`;
    await channel.send({
      embeds: [new EmbedBuilder()
        .setColor(0xe74c3c)
        .setDescription(`⏰ Tempo esgotado! Ninguém respondeu.\nA resposta era: **${certa}**`)
        .setTimestamp()
      ]
    }).catch(() => {});
  }, 30_000);

  jogosAtivos.set(chave, {
    correto: pergunta.r,
    categoria: catReal,
    pergunta,
    iniciadorId,
    timer,
  });
}

export const comandos = [
  { cmd: '!quiz [categoria]',  desc: `Quiz interativo (+${30} XP por acerto). Responda com A/B/C/D no chat.` },
  { cmd: '!quizstats [@user]', desc: 'Estatísticas de quiz.' },
  { cmd: '!topquiz',           desc: 'Ranking de acertos no quiz.' },
];

export function register(client, configs) {
  if (client.__quizRegistrado) return;
  client.__quizRegistrado = true;

  client.on('messageCreate', async (msg) => {
    try {
    if (msg.author.bot || !msg.guild) return;
    const cfg     = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    const guildId = msg.guild.id;
    const chave   = `${msg.channel.id}:${guildId}`;

    // ── Verificar resposta de quiz ativo (antes do prefixo) ─
    const jogoAtual = jogosAtivos.get(chave);
    if (jogoAtual && !msg.content.startsWith(prefixo)) {
      const resposta = msg.content.trim().toUpperCase();
      if (!LETRAS.includes(resposta)) return;

      const idx     = LETRAS.indexOf(resposta);
      const correto = idx === jogoAtual.correto;

      clearTimeout(jogoAtual.timer);
      jogosAtivos.delete(chave);

      const certa = `${LETRAS[jogoAtual.correto]}) ${jogoAtual.pergunta.ops[jogoAtual.correto]}`;

      if (correto) {
        const xpGanho = XP_EVENTS?.QUIZ ?? 30;

        try {
          const stats    = await QuizModel.findOne({ userId: msg.author.id, guildId });
          const contagem = (() => {
            try { return JSON.parse(stats?.categoriasContagem || '{}'); } catch { return {}; }
          })();
          contagem[jogoAtual.categoria] = (contagem[jogoAtual.categoria] || 0) + 1;
          const favorita = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

          await QuizModel.findOneAndUpdate(
            { userId: msg.author.id, guildId },
            {
              $inc: { total: 1, acertos: 1 },
              $set: { categoriasContagem: JSON.stringify(contagem), categoriaFavorita: favorita },
              $setOnInsert: { userId: msg.author.id, guildId },
            },
            { upsert: true }
          );
        } catch {}

        await ganharXP(msg.author.id, guildId, xpGanho, 'quiz').catch(() => {});
        await progredirMissao(msg.author.id, guildId, 'quiz', 1, msg.channel).catch(() => {});

        return msg.channel.send({
          embeds: [new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('✅ Acertou!')
            .setDescription(`<@${msg.author.id}> acertou! A resposta era **${certa}**\n+${xpGanho} XP!`)
            .setTimestamp()
          ]
        });
      } else {
        try {
          await QuizModel.findOneAndUpdate(
            { userId: msg.author.id, guildId },
            { $inc: { total: 1, erros: 1 }, $setOnInsert: { userId: msg.author.id, guildId } },
            { upsert: true }
          );
        } catch {}

        return msg.channel.send({
          embeds: [new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('❌ Errou!')
            .setDescription(`<@${msg.author.id}> errou! A resposta certa era **${certa}**\nOutros ainda podem responder... ah, espera — só uma tentativa por quiz!`)
            .setTimestamp()
          ]
        });
      }
    }

    // ── Comandos ────────────────────────────────────────────
    if (!msg.content.startsWith(prefixo)) return;
    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd  = args.shift().toLowerCase();

    // !quiz
    if (cmd === 'quiz') {
      const cdKey  = `quiz:${msg.author.id}:${guildId}`;
      const espera = checkCooldown(cdKey, 15_000);
      if (espera)
        return msg.reply({ embeds: [embedErro(`Aguarde **${formatarTempo(espera)}** para iniciar novo quiz.`)] });

      const categoriaInput = args[0]?.toLowerCase();
      if (categoriaInput) {
        const cat = TODAS_CATS.find(c => c.startsWith(categoriaInput)) || 'geral';
        return iniciarQuiz(msg.channel, msg.author.id, guildId, cat);
      }

      // Sem argumento — menu de seleção de categoria (só o criador escolhe)
      const opcoes = [
        new StringSelectMenuOptionBuilder().setLabel('Geral').setValue('geral').setDescription('Perguntas de todas as categorias').setEmoji('🌐'),
        new StringSelectMenuOptionBuilder().setLabel('Roblox').setValue('roblox').setDescription('Perguntas sobre Roblox').setEmoji('🎮'),
        new StringSelectMenuOptionBuilder().setLabel('Anime').setValue('anime').setDescription('Anime e mangá').setEmoji('🎌'),
        new StringSelectMenuOptionBuilder().setLabel('Matemática').setValue('matematica').setDescription('Cálculos e lógica').setEmoji('🔢'),
        new StringSelectMenuOptionBuilder().setLabel('Tecnologia').setValue('tecnologia').setDescription('Informática e tech').setEmoji('💻'),
        new StringSelectMenuOptionBuilder().setLabel('História').setValue('historia').setDescription('Brasil e mundo').setEmoji('📜'),
      ];

      const menu = new StringSelectMenuBuilder()
        .setCustomId(`quizcat:${msg.author.id}:${guildId}`)
        .setPlaceholder('Escolha uma categoria...')
        .addOptions(opcoes);

      const row   = new ActionRowBuilder().addComponents(menu);
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🧠 Quiz FiskBot')
        .setDescription(
          'Selecione uma categoria para começar!\n' +
          'Você tem **30 segundos** para escolher.\n\n' +
          '> Após o quiz iniciar, **qualquer pessoa** pode responder digitando\n' +
          '> **A**, **B**, **C** ou **D** no chat — sem botões!'
        )
        .addFields(
          { name: '🌐 Geral',      value: 'Mistura de todas',    inline: true },
          { name: '🎮 Roblox',     value: 'Perguntas de Roblox', inline: true },
          { name: '🎌 Anime',      value: 'Anime & Mangá',        inline: true },
          { name: '🔢 Matemática', value: 'Cálculos',             inline: true },
          { name: '💻 Tecnologia', value: 'Tech & Info',          inline: true },
          { name: '📜 História',   value: 'Brasil & Mundo',       inline: true },
        )
        .setFooter({ text: 'FiskBot • Quiz' });

      return msg.reply({ embeds: [embed], components: [row] });
    }

    // !quizstats
    if (cmd === 'quizstats') {
      const alvo = msg.mentions.users.first() || msg.author;
      const doc  = await QuizModel.findOne({ userId: alvo.id, guildId });
      if (!doc || doc.total === 0)
        return msg.reply({ embeds: [embedErro('Nenhum quiz registrado.')] });
      const precisao = ((doc.acertos / doc.total) * 100).toFixed(1);
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`📊 Stats de Quiz — ${alvo.displayName}`)
        .addFields(
          { name: '📝 Total',    value: String(doc.total),            inline: true },
          { name: '✅ Acertos',  value: String(doc.acertos),          inline: true },
          { name: '❌ Erros',    value: String(doc.erros),            inline: true },
          { name: '🎯 Precisão', value: `${precisao}%`,               inline: true },
          { name: '⭐ Favorita', value: doc.categoriaFavorita || 'N/A', inline: true },
        )
        .setTimestamp();
      return msg.reply({ embeds: [embed] });
    }

    // !topquiz
    if (cmd === 'topquiz') {
      const top = await QuizModel.find({ guildId }).sort({ acertos: -1 }).limit(10).lean();
      if (!top.length)
        return msg.reply({ embeds: [embedErro('Nenhum dado de quiz ainda.')] });
      const linhas = top.map((u, i) => {
        const pct = u.total > 0 ? ((u.acertos / u.total) * 100).toFixed(0) : '0';
        return `**#${i + 1}** <@${u.userId}> — ✅ ${u.acertos} acertos • ${u.total} jogos • 🎯 ${pct}%`;
      });
      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('🏆 Top Quiz')
        .setDescription(linhas.join('\n'))
        .setTimestamp();
      return msg.reply({ embeds: [embed] });
    }
    } catch (e) {
      console.error('[Quiz:msg]', e.message);
    }
  });
  // Select menu — escolha de categoria (só o iniciador)
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;
    if (!interaction.customId.startsWith('quizcat:')) return;

    const [, userId, guildId] = interaction.customId.split(':');
    if (interaction.user.id !== userId) {
      if (!interaction.replied && !interaction.deferred)
        await interaction.reply({ content: 'Apenas quem usou !quiz pode escolher a categoria.', flags: 64 }).catch(() => {});
      return;
    }

    try { await interaction.update({ components: [] }); } catch { /* interaction expired */ }
    const categoria = interaction.values[0];
    await iniciarQuiz(interaction.channel, userId, guildId, categoria);
  });
}
