process.env.PORT = process.env.PORT || "8080";

console.log("[FiskBot] Iniciando...");

import("./artifacts/api-server/dist/index.mjs").catch((err) => {
  console.error("[FiskBot] Erro ao iniciar:", err);
  process.exit(1);
});
