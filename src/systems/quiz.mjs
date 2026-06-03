import {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
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

// Categoria "geral" — mistura de todas
const TODAS_CATS = Object.keys(PERGUNTAS);

function sortearPergunta(categoria) {
  if (categoria === 'geral') {
    const cat = TODAS_CATS[Math.floor(Math.random() * TODAS_CATS.length)];
    const pergs = PERGUNTAS[cat];
    return { pergunta: pergs[Math.floor(Math.random() * pergs.length)], categoria: cat };
  }
  const pergs = PERGUNTAS[categoria] || PERGUNTAS[TODAS_CATS[0]];
  return { pergunta: pergs[Math.floor(Math.random() * pergs.length)], categoria };
}

const jogosAtivos = new Map();

// Inicia o quiz (usado tanto pelo comando direto quanto pelo select menu)
async function iniciarQuiz(channel, userId, guildId, categoria, replyFn) {
  const chave = `${userId}:${guildId}`;
  if (jogosAtivos.has(chave)) {
    await replyFn({ embeds: [embedErro('Você já tem um quiz em andamento!')] });
    return;
  }

  const { pergunta, categoria: catReal } = sortearPergunta(categoria);
  const catLabel = catReal.charAt(0).toUpperCase() + catReal.slice(1);

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`🧠 Quiz — ${catLabel}`)
    .setDescription(`**${pergunta.p}**`)
    .setFooter({ text: 'Você tem 30 segundos para responder!' })
    .setTimestamp();

  const botoes = pergunta.ops.map((op, i) =>
    new ButtonBuilder()
      .setCustomId(`quiz:${i}:${userId}:${guildId}`)
      .setLabel(`${['A', 'B', 'C', 'D'][i]}) ${op}`)
      .setStyle(ButtonStyle.Primary)
  );
  const row = new ActionRowBuilder().addComponents(botoes);
  const quizMsg = await replyFn({ embeds: [embed], components: [row] });

  jogosAtivos.set(chave, { correto: pergunta.r, categoria: catReal, msgId: quizMsg?.id });
  setTimeout(async () => {
    if (!jogosAtivos.has(chave)) return;
    jogosAtivos.delete(chave);
    await channel.messages.fetch(quizMsg?.id || '').then(m => m.edit({ components: [] })).catch(() => {});
    await channel.send({
      embeds: [new EmbedBuilder().setColor(0xe74c3c)
        .setDescription(`⏰ <@${userId}> o tempo esgotou! A resposta era: **${['A', 'B', 'C', 'D'][pergunta.r]}) ${pergunta.ops[pergunta.r]}**`)]
    }).catch(() => {});
  }, 30_000);
}

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();
    const guildId = msg.guild.id;

    if (cmd === 'quiz') {
      const cdKey = `quiz:${msg.author.id}:${guildId}`;
      const espera = checkCooldown(cdKey, 15_000);
      if (espera) return msg.reply({ embeds: [embedErro(`Aguarde **${formatarTempo(espera)}** para jogar novamente.`)] });

      const categoriaInput = args[0]?.toLowerCase();

      // Com argumento direto: !quiz roblox
      if (categoriaInput) {
        const cat = TODAS_CATS.find(c => c.includes(categoriaInput)) || 'geral';
        return iniciarQuiz(msg.channel, msg.author.id, guildId, cat, (opts) => msg.reply(opts));
      }

      // Sem argumento: mostrar menu de categorias
      const opcoes = [
        new StringSelectMenuOptionBuilder().setLabel('Geral').setValue('geral').setDescription('Perguntas de todas as categorias').setEmoji('🌐'),
        new StringSelectMenuOptionBuilder().setLabel('Roblox').setValue('roblox').setDescription('Perguntas sobre Roblox').setEmoji('🎮'),
        new StringSelectMenuOptionBuilder().setLabel('Anime').setValue('anime').setDescription('Perguntas sobre anime e mangá').setEmoji('🎌'),
        new StringSelectMenuOptionBuilder().setLabel('Matemática').setValue('matematica').setDescription('Cálculos e lógica').setEmoji('🔢'),
        new StringSelectMenuOptionBuilder().setLabel('Tecnologia').setValue('tecnologia').setDescription('Informática e tech').setEmoji('💻'),
        new StringSelectMenuOptionBuilder().setLabel('História').setValue('historia').setDescription('História do Brasil e do mundo').setEmoji('📜'),
      ];

      const menu = new StringSelectMenuBuilder()
        .setCustomId(`quizcat:${msg.author.id}:${guildId}`)
        .setPlaceholder('Escolha uma categoria...')
        .addOptions(opcoes);

      const row = new ActionRowBuilder().addComponents(menu);
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🧠 Quiz FiskBot')
        .setDescription('Selecione uma categoria para começar!\n\nVocê tem **30 segundos** para escolher.')
        .addFields(
          { name: '🌐 Geral', value: 'Mistura de todas', inline: true },
          { name: '🎮 Roblox', value: 'Perguntas de Roblox', inline: true },
          { name: '🎌 Anime', value: 'Anime & Mangá', inline: true },
          { name: '🔢 Matemática', value: 'Cálculos', inline: true },
          { name: '💻 Tecnologia', value: 'Tech & Info', inline: true },
          { name: '📜 História', value: 'Brasil & Mundo', inline: true },
        )
        .setFooter({ text: 'FiskBot • Quiz' });

      return msg.reply({ embeds: [embed], components: [row] });
    }

    if (cmd === 'quizstats') {
      const alvo = msg.mentions.users.first() || msg.author;
      const doc = await QuizModel.findOne({ userId: alvo.id, guildId });
      if (!doc || doc.total === 0) return msg.reply({ embeds: [embedErro('Nenhum quiz registrado.')] });
      const precisao = ((doc.acertos / doc.total) * 100).toFixed(1);
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`📊 Stats de Quiz — ${alvo.displayName}`)
        .addFields(
          { name: '📝 Total', value: String(doc.total), inline: true },
          { name: '✅ Acertos', value: String(doc.acertos), inline: true },
          { name: '❌ Erros', value: String(doc.erros), inline: true },
          { name: '🎯 Precisão', value: `${precisao}%`, inline: true },
          { name: '⭐ Favorita', value: doc.categoriaFavorita || 'N/A', inline: true },
        ).setTimestamp();
      return msg.reply({ embeds: [embed] });
    }

    if (cmd === 'topquiz') {
      const top = await QuizModel.find({ guildId }).sort({ acertos: -1 }).limit(10).lean();
      const linhas = top.map((u, i) => `**#${i + 1}** <@${u.userId}> — ✅ ${u.acertos} acertos (${u.total} jogos)`);
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🏆 Top Quiz')
        .setDescription(linhas.join('\n') || 'Nenhum dado.')
        .setTimestamp();
      return msg.reply({ embeds: [embed] });
    }
  });

  // ── Interactions (select menu de categoria + botões de resposta) ──
  client.on('interactionCreate', async (interaction) => {
    // Select menu: escolha de categoria
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('quizcat:')) {
      const [, userId, guildId] = interaction.customId.split(':');
      if (interaction.user.id !== userId)
        return interaction.reply({ content: 'Este menu não é seu.', ephemeral: true });

      const cdKey = `quiz:${userId}:${guildId}`;
      // Remove o select menu e inicia o quiz
      await interaction.update({ components: [] }).catch(() => {});

      const categoria = interaction.values[0];
      await iniciarQuiz(
        interaction.channel,
        userId,
        guildId,
        categoria,
        (opts) => interaction.channel.send(opts)
      );
      return;
    }

    // Botão de resposta
    if (!interaction.isButton() || !interaction.customId.startsWith('quiz:')) return;
    const [, respostaStr, userId, guildId] = interaction.customId.split(':');
    if (interaction.user.id !== userId)
      return interaction.reply({ content: 'Este quiz não é seu.', ephemeral: true });

    const chave = `${userId}:${guildId}`;
    const jogo = jogosAtivos.get(chave);
    if (!jogo) return interaction.reply({ content: 'Este quiz expirou.', ephemeral: true });

    jogosAtivos.delete(chave);
    const resposta = parseInt(respostaStr);
    const correto = resposta === jogo.correto;
    const xpGanho = correto ? XP_EVENTS.QUIZ : 0;

    // Atualizar stats — também rastreia categoria favorita
    try {
      const stats = await QuizModel.findOne({ userId, guildId });
      const contagem = stats?.categoriasContagem || {};
      contagem[jogo.categoria] = (contagem[jogo.categoria] || 0) + 1;
      const favorita = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      await QuizModel.findOneAndUpdate(
        { userId, guildId },
        {
          $inc: { total: 1, acertos: correto ? 1 : 0, erros: correto ? 0 : 1 },
          $set: { categoriasContagem: JSON.stringify(contagem), categoriaFavorita: favorita },
          $setOnInsert: { userId, guildId },
        },
        { upsert: true }
      );
    } catch {}

    if (correto && xpGanho > 0) {
      await ganharXP(userId, guildId, xpGanho, 'quiz').catch(() => {});
    }

    await progredirMissao(userId, guildId, 'quiz').catch(() => {});

    const embed = new EmbedBuilder()
      .setColor(correto ? 0x2ecc71 : 0xe74c3c)
      .setDescription(
        correto
          ? `✅ Correto! <@${userId}> acertou! +${xpGanho} XP 🎉`
          : `❌ Errado! A resposta certa era: **${['A', 'B', 'C', 'D'][jogo.correto]}**`
      ).setTimestamp();

    await interaction.update({ embeds: [embed], components: [] }).catch(() => {});
  });
}
