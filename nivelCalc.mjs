export function xpParaNivel(nivel) {
  return 5 * nivel * nivel + 50 * nivel + 100;
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

export const CARGOS_NIVEL = [
  { nivel: 1, nome: 'Novato' },
  { nivel: 5, nome: 'Ativo' },
  { nivel: 10, nome: 'Veterano' },
  { nivel: 15, nome: 'Elite' },
  { nivel: 20, nome: 'Lenda' },
  { nivel: 30, nome: 'Mestre' },
  { nivel: 40, nome: 'Imortal' },
  { nivel: 50, nome: 'Supremo' },
  { nivel: 60, nome: 'Mítico' },
  { nivel: 70, nome: 'Celestial' },
  { nivel: 80, nome: 'Divino' },
  { nivel: 100, nome: 'Deus do Servidor' },
];

export const NIVEL_AFINIDADE = [
  { min: 0, max: 99, nome: 'Conhecidos' },
  { min: 100, max: 299, nome: 'Amigos' },
  { min: 300, max: 599, nome: 'Bons Amigos' },
  { min: 600, max: 999, nome: 'Muito Próximos' },
  { min: 1000, max: 1999, nome: 'Parceiros' },
  { min: 2000, max: Infinity, nome: 'Alma Gêmea' },
];

export function nivelAfinidade(pontos) {
  return NIVEL_AFINIDADE.find(n => pontos >= n.min && pontos <= n.max)?.nome || 'Alma Gêmea';
}
