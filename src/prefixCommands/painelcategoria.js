const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const estoque = require('../utils/estoque');
const { formatBRL } = require('../utils/robuxConverter');
const { isAdmin } = require('./settaxa');
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
  const linhas = cat.produtos
    .filter((p) => p.ativo)
    .map((p) => {
      const qtd = p.controlarQtd ? `${p.quantidade}x` : '';
      return qtd ? `${qtd} **${p.nome}** — ${formatBRL(p.valor)}` : `**${p.nome}** — ${formatBRL(p.valor)}`;
    });

  return new EmbedBuilder()
    .setColor(0xbeb6ff)
    .setTitle(`📦 ${cat.nome}`)
    .setDescription(linhas.length ? linhas.join('\n') : 'Nenhum produto disponível.')
    .setFooter({ text: '*valor por unidade*' });
}

// Painel visual para o admin escolher qual categoria fixar no canal
function construirPainelSelecao() {
  const cats = estoque.categorias();
  const descricaoCats = cats.map((c) => `**${c.id}** — ${c.produtos.length} produto(s)`).join('\n');
  const embed = new EmbedBuilder()
    .setColor(0xbeb6ff)
    .setTitle('📌 Fixar painel de categoria')
    .setDescription(
      'Escolha a categoria para fixar no canal com os produtos:\n\n' +
      (cats.length ? descricaoCats : 'Nenhuma categoria cadastrada.')
    );

  // Agrupa em linhas de ate 5 botoes
  const linhas = [];
  let linha = new ActionRowBuilder();
  cats.forEach((c, i) => {
    if (i > 0 && i % 5 === 0) {
      linhas.push(linha);
      linha = new ActionRowBuilder();
    }
    linha.addComponents(
      new ButtonBuilder()
        .setCustomId(`painelcat:${c.id}`)
        .setLabel(c.id.slice(0, 80))
        .setStyle(ButtonStyle.Primary)
    );
  });
  if (linha.components.length) linhas.push(linha);

  return { embeds: [embed], components: linhas };
}

module.exports = {
  name: 'painelcategoria',
  description: 'Fixa no canal os produtos de uma categoria (restrito a administradores)',
  usage: '!painelcategoria <categoria>',

  async execute(message, args) {
    if (!message.guild || !isAdmin(message.member, message.author.id)) {
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

    const msg = await message.channel.send({ embeds: [embed] });
    salvar(msg.id, catId, message.channel.id);

    // Confirmação some depois de 5 segundos para não poluir o canal
    const confirmacao = await message.reply(`✅ Painel da categoria **${catId}** fixado no canal.`);
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
