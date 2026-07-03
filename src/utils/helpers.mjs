export function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

export function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

export function capitalize(str) { return str ? str[0].toUpperCase() + str.slice(1).toLowerCase() : ''; }

export function formatarData(date) {
  return new Date(date).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });
}

export function formatarTempo(ms) {
  if (ms < 60000) return `${Math.round(ms/1000)}s`;
  if (ms < 3600000) return `${Math.floor(ms/60000)}m ${Math.round((ms%60000)/1000)}s`;
  return `${Math.floor(ms/3600000)}h ${Math.floor((ms%3600000)/60000)}m`;
}

export function truncate(str, len = 30) { return str && str.length > len ? str.slice(0, len-1)+'…' : str; }

export function progressBar(current, max, size = 10, filled = '█', empty = '░') {
  const pct = Math.min(current / max, 1);
  const n = Math.round(pct * size);
  return filled.repeat(n) + empty.repeat(size - n);
}
