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
    xpTotal: 0,
    xpDisponivel: 0,
    nivel: 1,
    fundo: 'escuro',
    moldura: 'padrao',
    tituloEquipado: null,
    badgeEquipado: null,
    efeitoEquipado: null,
    inventario: {
      fundos: ['padrao'],
      molduras: ['padrao'],
      efeitos: [],
      titulos: [],
      badges: []
    },
    badges: [],
    efeitos: [],
    titulos: [],
    reputacao: 0,
    casadoCom: null,
    quiz: {
      vidas: 3,
      maxVidas: 3,
      pulos: 0,
      acertos: 0,
      erros: 0
    },
    ultimaRep: null,
    ultimaMensagem: null,
    ultimoXP: null,
    createdAt: new Date(),
    updatedAt: new Date()
  }
});
