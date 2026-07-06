import { makeModel } from '../sqlite.mjs';

export default makeModel('usuarios', {
  jsonFields: [
    'quiz',
    'titulos'
  ],

  dateFields: [
    'ultimaRep',
    'ultimaMensagem',
    'ultimoXP',
    'createdAt',
    'updatedAt'
  ],

  defaults: {
    // Economia
    xpTotal: 0,
    xpDisponivel: 0,
    nivel: 1,

    // Perfil
    tituloEquipado: null,
    titulos: [],

    // Social
    reputacao: 0,
    casadoCom: null,

    // Quiz
    quiz: {
      vidas: 3,
      maxVidas: 3,
      pulos: 0,
      acertos: 0,
      erros: 0
    },

    // Controle
    ultimaRep: null,
    ultimaMensagem: null,
    ultimoXP: null,

    // Datas
    createdAt: new Date(),
    updatedAt: new Date()
  }
});
