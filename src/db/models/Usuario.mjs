import { makeModel } from '../sqlite.mjs';

export default makeModel('usuarios', {
  jsonFields: [
    // 🏷️ sistema social
    'titulos',

    // 🛒 economia / loja
    'inventario',
    'badges',
    'efeitos',

    // 🎮 sistemas internos
    'quiz'
  ],

  dateFields: [
    'ultimaRep',
    'ultimaMensagem',
    'ultimoXP',
    'createdAt',
    'updatedAt'
  ],

  defaults: {
    // 💰 economia principal
    xpTotal: 0,
    xpDisponivel: 0,
    nivel: 1,

    // 🏷️ títulos
    titulos: [],

    // 🛒 inventário centralizado
    inventario: {
      moldura: 'padrao',
      fundo: 'azul',
      titulo: null
    },

    badges: [],
    efeitos: [],

    // 🎮 quiz system (com expansão futura)
    quiz: {
      vidas: 3,
      maxVidas: 3,
      pulos: 0,
      acertos: 0,
      erros: 0
    },

    // ⏱️ controle social simples (sem duplicar casamento real)
    ultimaRep: null,
    ultimaMensagem: null,
    ultimoXP: null,

    // 📊 controle base
    createdAt: new Date(),
    updatedAt: new Date()
  }
});
