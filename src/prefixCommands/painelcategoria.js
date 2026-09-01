const fs = require('node:fs');
const { comandoPode } = require('../utils/permissions');
const path = require('node:path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const estoque = require('../utils/estoque');
const { formatBRL } = require('../utils/robuxConverter');
const { autoDelete } = require('../utils/autoDelete');

const FILE = path.join(__dirname, '..', '..', 'data', 'painel_categoria.json');

function carregar() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; }
}
function salvar(msgId, catId, channelId) {
  const dados = carregar();
  dados[msgId] = { catId, channelId };
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(dados, null, 2));
}

function buildCategoria(catId) {
  const cat = estoque.categoria(catId);
  if (!cat) return null;
  const emoji = cat.emoji ? `${cat.emoji} ` : '📦 ';
  const linhas = cat.produtos
    .filter((p) => p.ativo)
    .map((p) => {
      const qtd = p.controlarQtd ? `${p.quantidade}x` : '';
      const desc = p.descricao ? ` — _${p.descricao}_` : '';
      return `${qtd ? qtd + ' ' : ''}**${p.nome}** — ${formatBRL(p.valor)}${desc}`;
    });

  return new EmbedBuilder()
    .setColor(0xbeb6ff)
    .setTitle(`${emoji}${cat.nome}`)
    .setDescription(
      `${cat.descricao ? `*${cat.descricao}*\n\n` : ''}${linhas.length ? linhas.join('\n') : 'Nenhum produto disponível.'}`
    )
    .setFooter({ text: '*valor por unidade*' });
}

// Painel visual para o admin escolher qual categoria fixar no canal
function construirPainelSelecao(pag = 0) {
  const cats = estoque.categorias();
  const POR_PAGINA = 8;
  const totalPaginas = Math.max(1, Math.ceil(cats.length / POR_PAGINA));
  const paginaAtual = numeroPagina(pag, totalPaginas);
  const visiveis = cats.slice(paginaAtual * POR_PAGINA, (paginaAtual + 1) * POR_PAGINA);

  const emojiDe = (c) => (c.emoji ? `${c.emoji} ` : '📦 ');
  const descricaoCats = visiveis
    .map((c) => `${emojiDe(c)}**${c.nome}** — ${c.produtos.length} produto(s)${c.descricao ? ` — _${c.descricao}_` : ''}`)
    .join('\n');
  const embed = new EmbedBuilder()
    .setColor(0xbeb6ff)
    .setTitle(cats.length > POR_PAGINA ? `📌 Fixar painel de categoria (${paginaAtual + 1}/${totalPaginas})` : '📌 Fixar painel de categoria')
    .setDescription(
      'Escolha a categoria para fixar no canal com os produtos:\n\n' +
      (cats.length ? descricaoCats : 'Nenhuma categoria cadastrada.') +
      '\n\n_Agora com **🏷️ Gerenciar categorias** para editar emoji, descrição e reordenar._'
    );

  // Agrupa em linhas de ate 4 botoes (max 2 linhas por página)
  const linhas = [];
  let linha = new ActionRowBuilder();
  visiveis.forEach((c, i) => {
    if (i > 0 && i % 4 === 0) {
      linhas.push(linha);
      linha = new ActionRowBuilder();
    }
    linha.addComponents(
      new ButtonBuilder()
        .setCustomId(`painelcat:${c.id}`)
        .setLabel(`${emojiDe(c)} ${c.nome.slice(0, 12)}`)
        .setStyle(ButtonStyle.Primary)
    );
  });
  if (linha.components.length) linhas.push(linha);

  // Botão "Gerenciar" sempre disponível(mesmo sem categorias,e mesmo com paginação).
  const navComps = [];
  if (paginaAtual >   0) navComps.push(new ButtonBuilder().setCustomId(`painelcat:pag:${paginaAtual -   1}`).setLabel("◀️ Anterior").setStyle(ButtonStyle.Primary));
  navComps.push(
    new ButtonBuilder().setCustomId('painelcat:gercat')
      .setLabel(cats.length ? '🏷️ Gerenciar' : '🏷️ Gerenciar categorias')
      .setStyle(ButtonStyle.Secondary)
  );
  if (paginaAtual < totalPaginas -  1) navComps.push(new ButtonBuilder().setCustomId(`painelcat:pag:${paginaAtual +  1}`).setLabel('Próxima ▶️').setStyle(ButtonStyle.Secondary));
  if (navComps.length) linhas.push(new ActionRowBuilder().addComponents(...navComps));

  return { embeds: [embed], components: linhas };
}

function numeroPagina(pag, total) {
  if (typeof pag !== 'number' || !Number.isFinite(pag)) return 0;
  if (total <= 1) return 0;
  return Math.min(Math.max(0, Math.floor(pag)), total -  1);
}


module.exports = {
  name: 'painelcategoria',
  description: 'Fixa no canal os produtos de uma categoria (restrito a administradores)',
  usage: '!painelcategoria <categoria>',

  async execute(message, args) {
    if (!message.guild || !comandoPode(message.member, message.author.id, 'painelcategoria')) {
      return message.reply('🔒 Somente administradores podem usar este comando.');
    }

    // Sem argumentos: abre o seletor visual de categorias para o admin escolher
    // qual fixar no canal (sem precisar digitar o id). Para editar o estoque use !configestoque.
    if (args.length === 0) {
      return message.reply({ ...construirPainelSelecao(), allowedMentions: { repliedUser: false } });
    }

    const catId = (args[0] || '').toLowerCase().trim();
    if (!catId) {
      const cats = estoque.categorias().map((c) => `\`${c.id}\``).join(', ') || '(nenhuma)';
      return message.reply(`❌ Use: \`!painelcategoria <categoria>\` — categorias: ${cats}`);
    }

    const embed = buildCategoria(catId);
    if (!embed) {
      return message.reply(`❌ Categoria \`${catId}\` não encontrada.`);
    }

    // Suporte canal: !painelcategoria <id> [#canal] — fixa no canal mencionado, ou no atual.
    const canalAlvo = message.mentions?.channels?.first() || message.channel;
    if (!canalAlvo.isTextBased() || !canalAlvo.permissionsFor(message.guild.members.me)?.has('SendMessages')) {

      return message.reply(`❌ Não posso publicar em ${canalAlvo} (precisa ser um canal de texto com permissão de envio para mim).`);
    }

    const msg = await canalAlvo.send({ embeds: [embed] });
    salvar(msg.id, catId, canalAlvo.id);

    // Confirmação some depois de 5 segundos para não poluir o canal
    const confirmacao = await message.reply(`✅ Painel da categoria **${catId}** fixado em ${canalAlvo}.`);
    autoDelete(confirmacao, 5000);
    autoDelete(message, 5000);
  },

  // Chamado pela index ao alterar o estoque
  async refresh(client) {
    const dados = carregar();
    for (const [msgId, info] of Object.entries(dados)) {
      try {
        // Compatibilidade: formato antigo (string) ou novo (objeto)
        const catId = typeof info === 'string' ? info : info.catId;
        const channelId = typeof info === 'string' ? null : info.channelId;

        if (channelId) {
          const ch = await client.channels.fetch(channelId).catch(() => null);
          if (ch) {
            const msg = await ch.messages.fetch(msgId).catch(() => null);
            if (msg) {
              const embed = buildCategoria(catId);
              if (embed) await msg.edit({ embeds: [embed] });
            }
          }
        }
      } catch {}
    }
  },

  buildCategoria,
  salvar,
  construirPainelSelecao,
};
