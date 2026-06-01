const cooldowns = new Map();

export function checkCooldown(key, ms) {
  const now = Date.now();
  const last = cooldowns.get(key) || 0;
  const restante = last + ms - now;
  if (restante > 0) return Math.ceil(restante / 1000);
  cooldowns.set(key, now);
  return 0;
}

export function setCooldown(key, ms) {
  cooldowns.set(key, Date.now() + ms - ms);
}

export function limparCooldown(key) {
  cooldowns.delete(key);
}

export function formatarTempo(segundos) {
  if (segundos < 60) return `${segundos}s`;
  if (segundos < 3600) return `${Math.floor(segundos / 60)}m ${segundos % 60}s`;
  return `${Math.floor(segundos / 3600)}h ${Math.floor((segundos % 3600) / 60)}m`;
}
