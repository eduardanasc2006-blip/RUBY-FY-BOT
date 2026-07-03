// Gerenciamento de badges via perfilvisual.mjs e loja.mjs
// Este arquivo expõe utilitários de badges
export const comandos = [];
export function register() {}

export function getBadgeInfo(id) {
  const { badges } = await import('./perfilConfig.mjs');
  return badges[id] ?? null;
}
