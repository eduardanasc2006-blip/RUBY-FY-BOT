const { EmbedBuilder } = require('discord.js');
const estoque = require('../utils/estoque');
const { publicoCategorias } = require('../utils/estoquePanel');
const { formatBRL } = require('../utils/robuxConverter');

module.exports = {
  name: 'estoque',
  description: 'Mostra o estoque de produtos',
  usage: '!estoque',

  async execute(message, args) {
    // Busca: !estoque <nome> mostra só aquele produto
    if (args.length > 0) {
      const busca = args.join(' ').toLowerCase();
      const resultados = [];
      for (const cat of estoque.categorias()) {
        for (const p of cat.produtos) {
          if (p.nome.toLowerCase().includes(busca)) {
            const s = estoque.status(p);
            const qtd = p.controlarQtd && p.quantidade > 1 ? `\n📦 ${p.quantidade} unidades` : '';
            resultados.push(
              `${s.emoji} **${p.nome}** *(${cat.nome})*\n💵 ${formatBRL(p.valor)}\n${s.texto}${qtd}`
            );
          }
        }
      }
      if (!resultados.length) {
        return message.reply(`🔍 Nenhum produto encontrado para "**${busca}**".`);
      }
      const embed = new EmbedBuilder()
        .setColor(0xbeb6ff)
        .setTitle(`🔍 Busca: ${busca}`)
        .setDescription(resultados.join('\n\n'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    return message.reply({ ...publicoCategorias(), allowedMentions: { repliedUser: false } });
  },
};
