const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { publicoCategorias } = require('../utils/estoquePanel');
const estoque = require('../utils/estoque');
const { formatBRL } = require('../utils/robuxConverter');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('estoque')
    .setDescription('Mostra o estoque de produtos')
    .addStringOption((o) =>
      o
        .setName('produto')
        .setDescription('Nome do produto para buscar (opcional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const busca = (interaction.options.getString('produto') || '').trim();

    // Busca por nome: equivalente ao !estoque <nome>
    if (busca) {
      const alvo = busca.toLowerCase();
      const resultados = [];
      for (const cat of estoque.categorias()) {
        for (const p of cat.produtos) {
          if (p.nome.toLowerCase().includes(alvo)) {
            const s = estoque.status(p);
            const qtd = p.controlarQtd && p.quantidade > 1 ? `\n📦 ${p.quantidade} unidades` : '';
            resultados.push(
              `${s.emoji} **${p.nome}** *(${cat.nome})*\n💵 ${formatBRL(p.valor)}\n${s.texto}${qtd}`
            );
          }
        }
      }
      if (!resultados.length) {
        return interaction.reply(`🔍 Nenhum produto encontrado para "**${busca}**".`);
      }
      const embed = new EmbedBuilder()
        .setColor(0xbeb6ff)
        .setTitle(`🔍 Busca: ${busca}`)
        .setDescription(resultados.join('\n\n'));
      return interaction.reply({ embeds: [embed] });
    }

    return interaction.reply(publicoCategorias());
  },
};
