const { execSync } = require("child_process");
const path = require("path");

console.log("[Discloud] Instalando dependências...");
execSync("pnpm install --frozen-lockfile", { stdio: "inherit" });

console.log("[Discloud] Compilando o bot...");
execSync("pnpm --filter @workspace/api-server run build", { stdio: "inherit" });

console.log("[Discloud] Iniciando FiskBot...");
const entry = path.resolve(__dirname, "artifacts/api-server/dist/index.mjs");
import(entry).catch((err) => {
  console.error("[Discloud] Erro ao iniciar:", err);
  process.exit(1);
});
