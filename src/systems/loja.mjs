import { makeModel } from '../sqlite.mjs';

export default makeModel('usuarios', {
  jsonFields: [
    // sistema atual
    'titulos',

    // 🛒 loja / inventário
    'inventario',
    'badges',
    'efeitos',

    // 🎮 quiz system
    'quiz',

    // 💍 relacionamentos (casamento / ship)
    'relacionamentos'
  ],

  dateFields: [
    'ultimaRep',
    'ultimaMensagem',
    'ultimoXP',
    'createdAt',
    'updatedAt'
  ],

  // 🔥 valores padrão automáticos (IMPORTANTE pro seu sistema não quebrar)
  defaults: {
    xpDisponivel: 0,
    xpTotal: 0,
    nivel: 1,

    titulos: [],

    inventario: {
      moldura: 'padrao',
      fundo: 'azul',
      titulo: null,
      badges: [],
      efeitos: []
    },

    badges: [],
    efeitos: [],

    quiz: {
      vidas: 3,
      maxVidas: 3,
      pulos: 0,
      acertos: 0
    },

    relacionamentos: {
      casado: false,
      parceiroId: null,
      dataCasamento: null
    },

    ultimaRep: null,
    ultimaMensagem: null,
    ultimoXP: null,
    createdAt: new Date(),
    updatedAt: new Date()
  }
});
