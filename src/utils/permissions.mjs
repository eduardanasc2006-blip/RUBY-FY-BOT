export function isAdmin(member, cfg) {
  if (!member) return false;
  if (member.permissions.has('Administrator')) return true;
  if (cfg?.cargoAdmin && member.roles.cache.has(cfg.cargoAdmin)) return true;
  return false;
}

export function isEquipe(member, cfg) {
  if (!member) return false;
  if (isAdmin(member, cfg)) return true;
  if (cfg?.cargoEquipe && member.roles.cache.has(cfg.cargoEquipe)) return true;
  if (cfg?.cargoSuporte && member.roles.cache.has(cfg.cargoSuporte)) return true;
  return false;
}

export function isVendedor(member, cfg) {
  if (!member) return false;
  if (isAdmin(member, cfg)) return true;
  if (cfg?.cargoVendedor && member.roles.cache.has(cfg.cargoVendedor)) return true;
  if (cfg?.cargoServicos && member.roles.cache.has(cfg.cargoServicos)) return true;
  return false;
}
