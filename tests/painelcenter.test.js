process.env.DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN || "fake-token";
process.env.ADMIN_IDS = "111111111111111111";
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("discord.js");
const guildId = "111111111111111111";
const member = { id: guildId, permissions: { has: () => true }, roles: { cache: new Map() }, guild: { id: guildId } };
const guild = { id: guildId, name: "Teste", members: { me: member } };
const channel = {
  id: "333", name: "vendas", guildId, guild, isTextBased: () => true,
  isThread: () => false, isVoiceBased: () => false,
  send: async () => ({ id: "m1", channelId: "333" }), client: {},
  permissionsFor: () => ({ has: () => true }),
};
function makeCache(iterable) {
  const m = new Map(iterable);
  m.filter = (fn) => makeCache([...m].filter(([, v]) => fn(v)));
  m.first = function (n) { return [...m.values()].slice(0, n === undefined ? 1 : n); };
  m.sort = function () { return m; };
  return m;
}
const cache = makeCache([[channel.id, channel]]);
channel.position = 0; channel.parent = null;
guild.channels = { cache };
channel.client = {};
let capturado = null;
const loginOriginal = Client.prototype.login;
Client.prototype.login = async function () { capturado = this; return "local"; };
require("../src/index.js");
Client.prototype.login = loginOriginal;
const client = capturado;
// Remove arquivos de painel por-guild p/ teste limpo
const PAINEIS_DIR = path.join(__dirname, "..", "data", "paineis");
try { fs.rmSync(path.join(PAINEIS_DIR, guildId + ".json")); } catch {}
function base(customId, extra = {}) {
  return {
    isButton: () => false, isModalSubmit: () => false,
    isStringSelectMenu: () => false, isChannelSelectMenu: () => false,
    isRoleSelectMenu: () => false, isUserSelectMenu: () => false,
    isMentionableSelectMenu: () => false, isAnySelectMenu: () => false,
    isChatInputCommand: () => false,
    customId, guildId, guild, member, user: { id: guildId },
    channel, message: { flags: { has: () => false } },
    reply: async (p) => { base.ultima = p; return p; },
    update: async (p) => { base.ultima = p; return p; },
    followUp: async (p) => { base.ultimaF = p; return p; },
    showModal: async (m) => { base.ultimoModal = m; return m; },
    ...extra,
  };
}
function btn(customId) { return base(customId, { isButton: () => true }); }
function selectMenu(customId, values) { return base(customId, { isStringSelectMenu: () => true, values }); }
(async () => {
  const pCenter = require("../src/utils/painelCenter");

  // 1) Abrir gerenciador central (deve estar por-guild)
  const resp = pCenter.buildPainelCentral(guildId);
  console.log("1) Painel central por-guild:", resp.embeds.length > 0 ? "OK" : "FALHOU");

  // 2) Clicar "📦 Estoque" -> deve mostrar seletor de canal, NÃO "Ação desconhecida"
  await client.emit("interactionCreate", btn("painelcenter:estoque"));
  const c1 = base.ultima && (base.ultima.content || (base.ultima.embeds && base.ultima.embeds.length ? "(embed)" : ""));
  const passou1 = !String(c1).includes("Ação desconhecida");
  console.log("2) Clique 'Estoque' -> seletor de canal (sem ação desconhecida):", passou1 ? "OK" : "FALHOU: " + c1);

  // 3) Clicar "📌 Canal atual"
  await client.emit("interactionCreate", btn("painelcenter:selcanal:estoque:atual"));
  const c2 = base.ultima && (base.ultima.content || (base.ultima.embeds && base.ultima.embeds.length ? "(embed)" : ""));
  const passou2 = !String(c2).includes("Ação desconhecida") && !String(c2).includes("Ocorreu um erro");
  console.log("3) Clique 'Canal atual' -> publica painel:", passou2 ? "OK" : "FALHOU: " + c2);

  // 4) Verificar que o registro por-guild foi salvo (estoquePanelStore)
  const esp = path.join(__dirname, "..", "data", "painel_estoque", guildId + ".json");
  let ref = null;
  try { ref = JSON.parse(fs.readFileSync(esp)); } catch {}
  const passou4 = ref && ref.channelId === "333" && ref.messageId === "m1";
  console.log("4) Registro por-guild salvo (painel_estoque):", passou4 ? "OK" : "FALHOU");

  // 5) Selecionar um canal via select menu
  await client.emit("interactionCreate", selectMenu("painelcenter:selcanal:conversao", ["333"]));
  const c5 = base.ultima && (base.ultima.content || (base.ultima.embeds && base.ultima.embeds.length ? "(embed)" : ""));
  const passou5 = !String(c5).includes("Ação desconhecida") && !String(c5).includes("Ocorreu um erro");
  console.log("5) Select menu conversao sem erro:", passou5 ? "OK" : "FALHOU");

  // 6) Cancelar volta ao painel central
  await client.emit("interactionCreate", btn("painelcenter:selcanal:estoque:cancelar"));
  const c6 = base.ultima;
  const passou6 = c6 && c6.embeds && c6.embeds.length > 0;
  console.log("6) Cancelar volta ao painel central:", passou6 ? "OK" : "FALHOU");

  const ok = passou1 && passou2 && passou4 && passou5 && passou6;
  console.log(ok ? "PAINELCENTER-OK" : "PAINELCENTER-FALHOU");
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error("ERRO:", e && e.stack || e); process.exit(1); });
