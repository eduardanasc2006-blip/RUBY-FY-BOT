const { comandoPode } = require('../utils/permissions');

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
  usage: '!embed [título | descrição | cor | imagem] — abre o editor visual (fields separados no botão ➕ Fields)',

  async execute(message, args) {
    if (!message.guild || !comandoPode(message.member, message.author.id, 'embed')) {
      return message.reply('🔒 Somente administradores podem usar este comando.');
    }

    // Sem argumentos: abre o painel visual
    if (args.length === 0) {
      const { buildPainel, getSessao } = require('../utils/embedPainel');
      // Upload por anexo: preenche a imagem do painel com a foto enviada junto ao '!embed'
      const anexoImg = message.attachments?.first();
      if (anexoImg && anexoImg.contentType?.startsWith('image/')) {
        const sessao = getSessao(message.author.id);
        sessao.imagem = anexoImg.url;
      }
      return message.reply({ ...buildPainel(message.author.id), allowedMentions: { repliedUser: false } });
    }

    // Com argumentos: preenche a sessao e abre o editor visual (mesmo fluxo do /embed)
    const { buildPainel, getSessao } = require('../utils/embedPainel');
    const sessao = getSessao(message.author.id);
    const texto = args.join(' ').trim();
    const anexo = message.attachments?.first();
    const temAnexo = anexo && anexo.contentType?.startsWith('image/');

    if (!texto && !temAnexo) {
      return message.reply(
        'Uso: !embed título | descrição | cor | imagem — ou anexe uma foto!\n' +
        'Cores: lilas, roxo, azul, verde, amarelo, vermelho, rosa, ou #hex\n' +
        'Exemplos: !embed Promoção | 500 Robux por R$ 19,00 | lilas'
      );
    }

    const partes = texto ? texto.split('|').map((s) => s.trim()) : [];
    const [titulo, descricao, corNome, imagemLink] = partes;

    if (titulo) sessao.titulo = titulo;
    if (descricao) sessao.descricao = descricao;
    if (corNome) sessao.cor = corNome;
    if (imagemLink && imagemLink.startsWith('http')) sessao.imagem = imagemLink;
    if (temAnexo) sessao.imagem = anexo.url;

    // Abre o editor visual: o usuario pode revisar, adicionar fields separados e enviar
    return message.reply({ ...buildPainel(message.author.id), allowedMentions: { repliedUser: false } });


  },

  resolverCor,
};
