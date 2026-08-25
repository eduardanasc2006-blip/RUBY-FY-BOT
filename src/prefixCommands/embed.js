const { EmbedBuilder } = require('discord.js');
const { isAdmin } = require('./settaxa');

// Cores disponíveis por nome + aceita hex (#rrggbb)
const CORES = {
  lilas: 0xbeb6ff,
  roxo: 0x7c3aed,
  azul: 0x5865f2,
  verde: 0x57f287,
  amarelo: 0xfee75c,
  vermelho: 0xed4245,
  rosa: 0xeb459e,
};

function resolverCor(entrada) {
  if (!entrada) return CORES.lilas;
  const nome = entrada.toLowerCase().trim();
  if (CORES[nome] !== undefined) return CORES[nome];
  // hex tipo #beb6ff ou beb6ff
  const hex = nome.replace('#', '');
  if (/^[0-9a-f]{6}$/i.test(hex)) return parseInt(hex, 16);
  return CORES.lilas;
}

module.exports = {
  name: 'embed',
  description: 'Cria uma embed personalizada no canal (restrito a administradores)',
  usage: '!embed título | descrição | [cor] | [imagem]',

  async execute(message, args) {
    if (!message.guild || !isAdmin(message.member, message.author.id)) {
      return message.reply('🔒 Somente administradores podem usar este comando.');
    }

    const texto = args.join(' ');
    if (!texto) {
      return message.reply(
        '❌ Use: `!embed título | descrição | cor | link-imagem`\n' +
        'Cores: lilas, roxo, azul, verde, amarelo, vermelho, rosa\n' +
        'Exemplo: `!embed Promoção ☁️ | 500 Robux por apenas R$ 19,00! | lilas`'
      );
    }

    const partes = texto.split('|').map((s) => s.trim());
    const [titulo, descricao, corNome, imagem] = partes;

    if (!titulo || !descricao) {
      return message.reply('❌ Precisa de pelo menos **título** e **descrição**, separados por `|`');
    }

    const embed = new EmbedBuilder()
      .setColor(resolverCor(corNome))
      .setTitle(titulo)
      .setDescription(descricao);

    if (imagem && imagem.startsWith('http')) {
      embed.setImage(imagem);
    }

    await message.channel.send({ embeds: [embed] });
    return message.delete().catch(() => {});
  },

  resolverCor,
};
