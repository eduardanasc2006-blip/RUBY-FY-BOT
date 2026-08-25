const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder } = require('discord.js');
const estoque = require('../utils/estoque');
const { formatBRL } = require('../utils/robuxConverter');
const { isAdmin } = require('./settaxa');

const FILE = path.join(__dirname, '..', '..', 'data', 'painel_categoria.json');

function carregar() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; }
}
function salvar(msgId, catId) {
  const dados = carregar();
  dados[msgId] = catId;
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
    .setColor(0xa8c6fa)
    .setTitle(`📦 ${cat.nome}`)
    .setDescription(linhas.length ? linhas.join('\n') : 'Nenhum produto disponível.')
    .setFooter({ text: '*valor por unidade*' });
}

module.exports = {
  name: 'painelcategoria',
  description: 'Fixa no canal os produtos de uma categoria (restrito a administradores)',
  usage: '!painelcategoria <categoria>',

  async execute(message, args) {
    if (!message.guild || !isAdmin(message.member, message.author.id)) {
      return message.reply('🔒 Somente administradores podem usar este comando.');
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
    salvar(msg.id, catId);
    return message.reply(`✅ Painel da categoria **${catId}** fixado no canal. Atualiza sozinho quando você mexer no estoque.`);
  },

  // Chamado pela index ao alterar o estoque
  async refresh(client) {
    const dados = carregar();
    for (const [msgId, catId] of Object.entries(dados)) {
      try {
        for (const guild of client.guilds.cache.values()) {
          for (const ch of guild.channels.cache.values()) {
            if (!ch.isTextBased()) continue;
            try {
              const msg = await ch.messages.fetch(msgId);
              const embed = buildCategoria(catId);
              if (embed) await msg.edit({ embeds: [embed] });
            } catch {}
          }
        }
      } catch {}
    }
  },

  buildCategoria,
};
