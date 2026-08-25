const { publicoCategorias } = require('../utils/estoquePanel');

module.exports = {
  name: 'estoque',
  description: 'Mostra o estoque de produtos',
  usage: '!estoque',

  async execute(message) {
    return message.reply({ ...publicoCategorias(), allowedMentions: { repliedUser: false } });
  },
};
