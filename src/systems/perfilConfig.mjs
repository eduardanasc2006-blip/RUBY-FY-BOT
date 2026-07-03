// ════════════════════════════════════════════════════════
//  MOLDURAS — padrao, neon_roxo, neon_azul, sakura, real,
//             sombria, angelical, demoniaca, futurista, galaxia
// ════════════════════════════════════════════════════════

export const molduras = {
  padrao: {
    nome: 'Padrão',
    preco: 0,
    raridade: 'Comum',
    descricao: 'Moldura padrão disponível para todos.'
  },
  neon_roxo: {
    nome: 'Neon Roxo',
    preco: 8000,
    raridade: 'Épico',
    descricao: 'Borda com brilho neon em roxo intenso.'
  },
  neon_azul: {
    nome: 'Neon Azul',
    preco: 8000,
    raridade: 'Épico',
    descricao: 'Borda com brilho neon em azul cibernético.'
  },
  sakura: {
    nome: 'Sakura',
    preco: 9000,
    raridade: 'Épico',
    descricao: 'Delicada moldura cor-de-rosa com toque japonês.'
  },
  real: {
    nome: 'Real',
    preco: 10000,
    raridade: 'Lendário',
    descricao: 'Moldura dourada luxuosa para verdadeiros reis.'
  },
  sombria: {
    nome: 'Sombria',
    preco: 7000,
    raridade: 'Raro',
    descricao: 'Energia roxa escura com aura misteriosa.'
  },
  angelical: {
    nome: 'Angelical',
    preco: 11000,
    raridade: 'Lendário',
    descricao: 'Brilho divino e puro, digno dos celestiais.'
  },
  demoniaca: {
    nome: 'Demoníaca',
    preco: 12000,
    raridade: 'Lendário',
    descricao: 'Chamas vermelhas das profundezas — poder obscuro.'
  },
  futurista: {
    nome: 'Futurista',
    preco: 9000,
    raridade: 'Épico',
    descricao: 'Tecnologia verde de última geração.'
  },
  galaxia: {
    nome: 'Galáxia',
    preco: 13000,
    raridade: 'Lendário',
    descricao: 'Borda cósmica com nebulosa e poeira estelar.'
  }
};

// ════════════════════════════════════════════════════════
//  FUNDOS — escuro, roxo, azul, vermelho, sakura,
//           noturno, galaxia, cyberpunk, floresta, oceano
// ════════════════════════════════════════════════════════

export const fundos = {
  escuro: {
    nome: 'Escuro',
    preco: 0,
    raridade: 'Comum',
    tipo: 'cor',
    valor: '#1e1f22'
  },
  roxo: {
    nome: 'Roxo',
    preco: 3000,
    raridade: 'Incomum',
    tipo: 'gradiente',
    cores: ['#1a003d', '#6a0dad']
  },
  azul: {
    nome: 'Azul',
    preco: 3000,
    raridade: 'Incomum',
    tipo: 'gradiente',
    cores: ['#0f2027', '#2c5364']
  },
  vermelho: {
    nome: 'Vermelho',
    preco: 3000,
    raridade: 'Incomum',
    tipo: 'gradiente',
    cores: ['#4d0000', '#cc0000']
  },
  sakura: {
    nome: 'Sakura',
    preco: 5000,
    raridade: 'Raro',
    tipo: 'gradiente',
    cores: ['#ff9a9e', '#fad0c4']
  },
  noturno: {
    nome: 'Noturno',
    preco: 5000,
    raridade: 'Raro',
    tipo: 'cor',
    valor: '#0a0a1a'
  },
  galaxia: {
    nome: 'Galáxia',
    preco: 7000,
    raridade: 'Épico',
    tipo: 'gradiente',
    cores: ['#0b0c2a', '#8e2de2']
  },
  cyberpunk: {
    nome: 'Cyberpunk',
    preco: 8000,
    raridade: 'Épico',
    tipo: 'gradiente',
    cores: ['#0f0f1a', '#00d4ff']
  },
  floresta: {
    nome: 'Floresta',
    preco: 6000,
    raridade: 'Raro',
    tipo: 'gradiente',
    cores: ['#0f2010', '#1a5c1a']
  },
  oceano: {
    nome: 'Oceano',
    preco: 6000,
    raridade: 'Raro',
    tipo: 'gradiente',
    cores: ['#000428', '#004e92']
  }
};

// ════════════════════════════════════════════════════════
//  EFEITOS
// ════════════════════════════════════════════════════════

export const efeitos = {
  aurora: {
    nome: 'Aurora',
    preco: 4000,
    raridade: 'Incomum',
    descricao: 'Luzes coloridas que flutuam'
  },
  estrelas: {
    nome: 'Estrelas',
    preco: 4000,
    raridade: 'Incomum',
    descricao: 'Pequenas estrelas brilhantes ao redor'
  },
  neve: {
    nome: 'Neve',
    preco: 4500,
    raridade: 'Raro',
    descricao: 'Flocos de neve caindo suavemente'
  },
  energia: {
    nome: 'Energia',
    preco: 5000,
    raridade: 'Raro',
    descricao: 'Campo de energia elétrica'
  },
  fumaca: {
    nome: 'Fumaça',
    preco: 5000,
    raridade: 'Raro',
    descricao: 'Névoa leve e escura'
  },
  petalas: {
    nome: 'Pétalas',
    preco: 5500,
    raridade: 'Épico',
    descricao: 'Flores caindo continuamente'
  },
  raios: {
    nome: 'Raios',
    preco: 7000,
    raridade: 'Lendário',
    descricao: 'Raios de energia brilhante'
  }
};

// ════════════════════════════════════════════════════════
//  BADGES
// ════════════════════════════════════════════════════════

export const badges = {
  estrela: {
    nome: 'Estrela',
    preco: 3000,
    raridade: 'Incomum',
    descricao: 'Brilho dourado intenso'
  },
  fogo: {
    nome: 'Fogo',
    preco: 3000,
    raridade: 'Incomum',
    descricao: 'Chamas vibrantes e intensas'
  },
  coroa: {
    nome: 'Coroa',
    preco: 8000,
    raridade: 'Épico',
    descricao: 'Realeza e poder absoluto'
  },
  rico: {
    nome: 'Rico',
    preco: 5000,
    raridade: 'Raro',
    descricao: 'Grande riqueza acumulada'
  },
  veterano: {
    nome: 'Veterano',
    preco: 5000,
    raridade: 'Raro',
    descricao: 'Experiência e honra'
  },
  quiz: {
    nome: 'Quiz',
    preco: 4000,
    raridade: 'Incomum',
    descricao: 'Mente afiada e conhecimento'
  },
  lendario: {
    nome: 'Lendário',
    preco: 12000,
    raridade: 'Lendário',
    descricao: 'Status lendário raro'
  },
  casal: {
    nome: 'Casal',
    preco: 3000,
    raridade: 'Incomum',
    descricao: 'Dois corações unidos'
  }
};
