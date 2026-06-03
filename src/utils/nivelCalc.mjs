// Fórmula: cada nível exige progressivamente mais XP (curva cúbica suave)
// Nível 0→1: ~300 XP | Nível 10→11: ~3300 XP | Nível 20→21: ~9300 XP
export function xpParaNivel(nivel) {
  return (5 * nivel * nivel + 50 * nivel + 100) * 3;
}

export function calcularNivel(xpTotal) {
  let nivel = 0;
  let xpRestante = xpTotal;
  while (xpRestante >= xpParaNivel(nivel)) {
    xpRestante -= xpParaNivel(nivel);
    nivel++;
  }
  return { nivel, xpAtual: xpRestante, xpProximo: xpParaNivel(nivel) };
}

export const FAIXAS_NIVEL = [
  { min: 1,   max: 9,   nome: 'Novato',      emoji: '🌱', cor: 0x95a5a6 },
  { min: 10,  max: 19,  nome: 'Aprendiz',    emoji: '📚', cor: 0x3498db },
  { min: 20,  max: 34,  nome: 'Ativo',       emoji: '⭐', cor: 0x2ecc71 },
  { min: 35,  max: 49,  nome: 'Experiente',  emoji: '🎖️', cor: 0x27ae60 },
  { min: 50,  max: 74,  nome: 'Veterano',    emoji: '🏆', cor: 0xf39c12 },
  { min: 75,  max: 99,  nome: 'Elite',       emoji: '💎', cor: 0x9b59b6 },
  { min: 100, max: 149, nome: 'Mestre',      emoji: '👑', cor: 0xe67e22 },
  { min: 150, max: 199, nome: 'Lenda',       emoji: '🌟', cor: 0xe74c3c },
  { min: 200, max: 299, nome: 'Mítico',      emoji: '🔥', cor: 0xc0392b },
  { min: 300, max: Infinity, nome: 'Divino', emoji: '⚡', cor: 0x8e44ad },
];

export function getFaixa(nivel) {
  return FAIXAS_NIVEL.find(f => nivel >= f.min && nivel <= f.max)
    || { nome: 'Novato', emoji: '🌱', cor: 0x95a5a6 };
}

export const CARGOS_NIVEL = [
  { nivel: 1,   nome: 'Novato' },
  { nivel: 10,  nome: 'Aprendiz' },
  { nivel: 20,  nome: 'Ativo' },
  { nivel: 35,  nome: 'Experiente' },
  { nivel: 50,  nome: 'Veterano' },
  { nivel: 75,  nome: 'Elite' },
  { nivel: 100, nome: 'Mestre' },
  { nivel: 150, nome: 'Lenda' },
  { nivel: 200, nome: 'Mítico' },
  { nivel: 300, nome: 'Divino' },
];

export const NIVEL_AFINIDADE = [
  { min: 0,    max: 99,       nome: 'Conhecidos',    emoji: '👋' },
  { min: 100,  max: 299,      nome: 'Amigos',        emoji: '🤝' },
  { min: 300,  max: 599,      nome: 'Bons Amigos',   emoji: '💖' },
  { min: 600,  max: 999,      nome: 'Muito Próximos',emoji: '💘' },
  { min: 1000, max: 1999,     nome: 'Especiais',     emoji: '💞' },
  { min: 2000, max: Infinity, nome: 'Alma Gêmea',    emoji: '❤️' },
];

export function nivelAfinidade(pontos) {
  return NIVEL_AFINIDADE.find(n => pontos >= n.min && pontos <= n.max)
    || NIVEL_AFINIDADE[NIVEL_AFINIDADE.length - 1];
}

export function xpParaNivelAbsoluto(nivel) {
  let total = 0;
  for (let i = 0; i < nivel; i++) total += xpParaNivel(i);
  return total;
}
