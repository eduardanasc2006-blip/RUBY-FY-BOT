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
  ],

  defaults: {
    // Economia
    xpTotal: 0,
    xpDisponivel: 0,
    nivel: 1,

    // Perfil
    fundo: 'padrao',
    tema: 'claro',
    moldura: 'padrao',

    tituloEquipado: null,
    badgeEquipado: null,
    efeitoEquipado: null,

    // Títulos
    titulos: [],

    // Inventário
    inventario: {
      fundos: ['padrao'],
      molduras: ['padrao'],
      efeitos: [],
      titulos: [],
      badges: []
    },

    // Coleções
    badges: [],
    efeitos: [],

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
