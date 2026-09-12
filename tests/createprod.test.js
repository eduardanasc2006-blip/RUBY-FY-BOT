process.env.DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN || "fake-token";
process.env.ADMIN_IDS = "111111111111111111";
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("discord.js");
const guildId = "111111111111111111";
const arq = path.join(__dirname, "..", "data", "estoque", guildId + ".json");
try { fs.rmSync(arq); } catch (e) {}
const member = { id: guildId, permissions: { has: () => true }, roles: { cache: new Map() }, guild: { id: guildId } };
const guild = { id: guildId, name: "Teste", members: { me: member }, channels: { cache: { get: () => null, size: 0 } } };
const channel = { id: "333", guildId, guild, isTextBased: () => true, send: async () => ({ id: "m1", channelId: "333" }), client: {} };
let capturado = null;
const loginOriginal = Client.prototype.login;
Client.prototype.login = async function () { capturado = this; return "local"; };
require("../src/index.js");
Client.prototype.login = loginOriginal;
const client = capturado;
function base(extra) {
  return {
    isButton: () => false,
    isModalSubmit: () => false,
    isStringSelectMenu: () => false,
    isChannelSelectMenu: () => false,
    isAnySelectMenu: () => false,
    isRoleSelectMenu: () => false,
    isUserSelectMenu: () => false,
    isMentionableSelectMenu: () => false,
    isChatInputCommand: () => false,
    guildId, guild, member, user: { id: guildId },
    channel, ...extra,
  };
}
function makeModal(customId, fields) {
  return base({
    isModalSubmit: () => true,
    customId,
    fields: { getTextInputValue: (k) => fields[k] || "" },
    reply: async (p) => { makeModal.ultima = p; return p; },
    update: async (p) => { makeModal.ultima = p; return p; },
    showModal: async (m) => { makeModal.ultimoModal = m; return m; },
  });
}
function makeButton(customId) {
  return base({
    isButton: () => true,
    customId,
    message: { flags: { has: () => false } },
    reply: async (p) => { makeButton.ultima = p; return p; },
    update: async (p) => { makeButton.ultima = p; return p; },
    showModal: async (m) => { makeButton.ultimoModal = m; return m; },
  });
}
(async () => {
  const estoque = require("../src/utils/estoque");
  const interAddCat = makeModal("estmodal:addcat", { nome: "Categoria Teste" });
  await client.emit("interactionCreate", interAddCat);
  const catCriada = estoque.categorias(guildId).some((c) => c.nome === "Categoria Teste");
  console.log("1) Categoria criada?", catCriada ? "SIM" : "NAO");
  const interAddProd = makeModal("estmodal:addprod:categoria-teste", { nome: "Produto Teste", valor: "10,00", qtd: "3", descricao: "Teste", imagem: "" });
  await client.emit("interactionCreate", interAddProd);
  const cat = estoque.categoria(guildId, "categoria-teste");
  const temProd = cat && cat.produtos.some((p) => p.nome === "Produto Teste" && p.valor === 10 && p.quantidade === 3);
  const resposta = makeModal.ultima && (makeModal.ultima.content || "");
  const terBtnExtra = makeModal.ultima && Array.isArray(makeModal.ultima.components) &&
    makeModal.ultima.components.some((row) => row.components.some((b) => b.data.custom_id === "estadm:addprod2:categoria-teste" && b.data.label.includes("Adicionar outro")));
  console.log("2) Produto criado?", temProd ? "SIM" : "NAO", "| resposta:", resposta.slice(0, 70));
  console.log("3) Botão 'Adicionar outro produto' presente?", terBtnExtra ? "SIM" : "NAO");
  const btn = makeButton("estadm:addprod2:categoria-teste");
  await client.emit("interactionCreate", btn);
  const modalAberto = makeButton.ultimoModal;
  console.log("4) Modal de novo produto aberto?", modalAberto ? "SIM" : "NAO", "| title:", modalAberto && modalAberto.data && modalAberto.data.title);
  const ok = catCriada && temProd && terBtnExtra && modalAberto;
  console.log(ok ? "CRIANDO-PRODUTO-OK" : "CRIANDO-PRODUTO-FALHOU");
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
