import { makeModel } from '../sqlite.mjs';

export default makeModel('usuarios', {
  jsonFields: [
    'inventario',
    'quiz',
    'badges',
    'efeitos',
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
    fundo: 'padrao',
    moldura: 'padrao',

    tituloEquipado: null,
    badgeEquipado: null,
    efeitoEquipado: null,

    // Inventário de cosméticos
    inventario: {
      fundos: ['padrao'],
      molduras: ['padrao'],
      efeitos: [],
      titulos: [],
      badges: []
    },

    // Coleções separadas (parse automático)
    badges: [],
    efeitos: [],
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
