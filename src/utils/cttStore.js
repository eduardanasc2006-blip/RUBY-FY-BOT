const fs = require("node:fs");
const path2 = require("node:path");
const crypto = require("node:crypto");

const FILE = path2.join(__dirname, "..", "..", "data", "ctt_conteudos.json");

function carregar() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}

function salvar(dados) {
  fs.mkdirSync(path2.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(dados, null, 2));
}

function tokenBotao(guildId, botao, idx) {
  const base = [guildId || "", idx || 0,
    botao.rotulo || "", botao.emoji || "", botao.acao || "",
    botao.estilo || "", botao.valor || "", botao.paginaIdx ?? ""].join("\u0000");
  return crypto.createHash("sha1").update(base).digest("hex").slice(0, 12);
}

function registrar(guildId, token, payload) {
  const dados = carregar();
  dados[token] = { guildId: guildId || "", ...payload };
  salvar(dados);
  return token;
}

function obter(token) {
  return carregar()[token] || null;
}

module.exports = { tokenBotao, registrar, obter };
