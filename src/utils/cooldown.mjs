const cooldowns = new Map();

  // Verifica cooldown. Retorna segundos restantes (>0) ou 0 se liberado.
  // Ao liberar, já marca o timestamp atual.
  export function checkCooldown(key, ms) {
    const now      = Date.now();
    const last     = cooldowns.get(key) || 0;
    const restante = last + ms - now;
    if (restante > 0) return Math.ceil(restante / 1000);
    cooldowns.set(key, now);
    return 0;
  }

  // Define manualmente um cooldown a partir de agora.
  // Bugfix: a versão original calculava Date.now() + ms - ms = Date.now() (sem efeito).
  export function setCooldown(key, ms) {
    cooldowns.set(key, Date.now());
  }

  // Remove cooldown imediatamente (permite usar antes do prazo).
  export function limparCooldown(key) {
    cooldowns.delete(key);
  }

  // Formata segundos para exibição legível.
  export function formatarTempo(segundos) {
    if (segundos < 60)   return `${segundos}s`;
    if (segundos < 3600) return `${Math.floor(segundos / 60)}m ${segundos % 60}s`;
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  