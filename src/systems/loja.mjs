import { makeModel } from '../sqlite.mjs';

export default makeModel('usuarios', {
  jsonFields: [
    // sistema base
    'titulos',

    // 🛒 LOJA / INVENTÁRIO COMPLETO
    'inventario',
    'badges',
    'efeitos',

    // 🎮 SISTEMAS
    'quiz',
    'forca',

    // 💍 RELACIONAMENTOS
    'relacionamentos'
  ],

  dateFields: [
    'ultimaRep',
    'ultimaMensagem',
    'ultimoXP',
    'createdAt',
    'updatedAt'
  ],

  // ─────────────────────────────────────────────
  // 🔥 DEFAULTS ATUALIZADOS (ECONOMIA + JOGOS)
  // ─────────────────────────────────────────────
  defaults: {
    xpDisponivel: 0,
    xpTotal: 0,
    nivel: 1,

    titulos: [],

    // 🧠 INVENTÁRIO COMPLETO (LOJA REAL)
    inventario: {
      moldura: 'padrao',
      fundo: 'azul',
      titulo: null,

      itens: {
        quiz: [],
        forca: [],
        xp: [],
        utilitarios: []
      },

      consumiveis: {
        vidasExtra: 0,
        dicasQuiz: 0,
        pulosQuiz: 0,
        letrasForca: 0,
        protecaoErro: 0,
        tempoExtra: 0
      },

      passivos: {
        xpBoost: 1.0,
        streakProtegido: false
      }
    },

    badges: [],
    efeitos: [],

    // 🎮 QUIZ SYSTEM NOVO
    quiz: {
      vidas: 3,
      maxVidas: 3,
      acertos: 0,
      erros: 0,
      total: 0,

      categoriaFavorita: null,
      streak: 0,
      ultimoJogo: null
    },

    // 🎯 FORCA SYSTEM NOVO
    forca: {
      vitorias: 0,
      derrotas: 0,
      streak: 0
    },

    // 💍 RELACIONAMENTOS
    relacionamentos: {
      casado: false,
      parceiroId: null,
      dataCasamento: null,
      afinidade: 0
    },

    ultimaRep: null,
    ultimaMensagem: null,
    ultimoXP: null,
    createdAt: new Date(),
    updatedAt: new Date()
  }
});
