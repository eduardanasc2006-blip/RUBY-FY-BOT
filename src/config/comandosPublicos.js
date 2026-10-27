// Comandos que ficam disponíveis também fora do servidor (DM) via User Install.
// Fonte única: tanto o deploy-commands.js quanto a sincronização no boot
// (src/index.js) leem daqui, para as duas listas nunca divergirem — quando
// divergiam, o boot sobrescrevia o registro do deploy e o comando sumia da DM.
module.exports = new Set([
  'ajuda',
  'estoque',
  'gamepass',
  'reais',
  'robux',
  'taxa',
  'calc',
  'comprar',
  'encomenda',
]);
