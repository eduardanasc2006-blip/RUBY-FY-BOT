const { comandoPode } = require('../utils/permissions');
const { getSessao, buildEscolhaPainel } = require('../utils/mensagemPainel');

module.exports = {
  name: 'mensagem',
  description: 'Publica uma mensagem simples (texto e/ou imagem) num canal (admin)',
  usage: '!mensagem [texto] — abre o editor (envie uma foto junto para usar como imagem)',

  async execute(message, args) {
    if (!message.guild || !comandoPode(message.member, message.author.id, 'mensagem')) {

      return message.reply('🔒 Somente administradores podem usar este comando.');
    }

    const sessao = getSessao(message.author.id);
    const anexoImg = message.attachments?.first();
    if (anexoImg && anexoImg.contentType?.startsWith('image/')) {
      sessao.imagem = anexoImg.url;

    }
    const texto = args.join(' ').trim();
    if (texto) sessao.mensagem = texto;



    return message.reply(buildEscolhaPainel(message.author.id));
  },
};