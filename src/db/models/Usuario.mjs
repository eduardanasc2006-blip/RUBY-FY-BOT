import { makeModel } from '../sqlite.mjs';

export default makeModel('usuarios', {
  jsonFields: [
    'titulos',
    'inventario',
    'badges',
    'efeitos',
    'quiz'
  ],

  dateFields: [
    'ultimaRep',
    'ultimaMensagem',
    'ultimoXP',
    'createdAt',
    'updatedAt'
  ]
});
