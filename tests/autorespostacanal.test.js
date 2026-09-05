process.env.DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN || "fake-token";
process.env.ADMIN_IDS = "111111111111111111";
const fs = require("node:fs");
const { Client } = require("discord.js");
const canalA = { id: "111", name: "geral", isTextBased: () => true, isVoiceBased: () => false, isThread: () => false, position: 0, parent: null, permissionsFor: () => ({ has: () => true }), send: async () => ({}), guild: null };
const canalB = { id: "222", name: "vendas", isTextBased: () => true, isVoiceBased: () => false, isThread: () => false, position: 1, parent: null, permissionsFor: () => ({ has: () => true }), send: async () => ({}), guild: null };
const colecaoCanais = {
  get: (id) => (id === canalA.id ? canalA : id === canalB.id ? canalB : null),
  filter: () => colecaoCanais,
  sort: () => colecaoCanais,
  first: () => [canalA, canalB],
  map: () => [],
  size: 2,
  forEach: () => {},
};
const member = { id: "111111111111111111", permissions: { has: () => true }, roles: { cache: new Map() } };
const guild = { id: "111111111111111111", name: "Teste", channels: { cache: colecaoCanais }, members: { me: member } };
canalA.guild = guild;
canalB.guild = guild;

const prefixo = require("../src/prefixCommands/autoresposta");
const store = require("../src/utils/autoRespostaStore");
const g = "111111111111111111";
const arq = require("node:path").join(__dirname, "..", "data", "autorespostas", g + ".json");
try { fs.rmSync(arq); } catch (e) {}
const uid = "111111111111111111";
async function msg(content, mencaoCanal = null) {
  const m = {
    guild,
    guildId: g,
    member,
    author: { id: uid, bot: false }, content,
    mentions: { channels: { first: () => mencaoCanal } },
    channel: canalA,
    reply: async (payload) => { m.ultimaResposta = payload; return payload; },
  };
  return m;
}

(async () => {
  // 1. !autoresposta canais (sem menção) abre o picker de canal
  const m1 = await msg("!autoresposta canais");
  await prefixo.execute(m1);
  const resp1 = m1.ultimaResposta;
  const sel1 = resp1.components?.[0]?.components?.[0];
  const btnAtual = resp1.components?.[1]?.components?.[0];
  const btnCanc = resp1.components?.[1]?.components?.[0];
  const pickerOk = resp1.components?.length === 2
    && sel1.data.custom_id === "autorespcanal"
    && btnCanc.data.custom_id === "autorespcanal:cancelar"
    && !resp1.components?.[1]?.components.some((c) => c.data.custom_id === "autorespcanal:atual");
  console.log(pickerOk ? "OK prefixo abre picker de canal" : "FALHA prefixo picker: " + JSON.stringify(resp1));
  if (!pickerOk) process.exit(1);

  // 2. Handler do select adiciona canal
  let proxResposta = null;
  const interSelect = {
    isStringSelectMenu: () => true,
    isButton: () => false,
    isModalSubmit: () => false,
    isRoleSelectMenu: () => false,
    isUserSelectMenu: () => false,
    isMentionableSelectMenu: () => false,
    isChannelSelectMenu: () => false,
    isAnySelectMenu: () => true,
    customId: "autorespcanal",
    values: ["222"],
    guild,
    guildId: g,
    member,
    user: { id: uid },
    channel: canalA,
    reply: async (payload) => { proxResposta = payload; return payload; },
    update: async (payload) => { proxResposta = payload; return payload; },
    deferred: false,
    replied: false,
  };
  let capturado = null;
  const loginOriginal = Client.prototype.login;
  Client.prototype.login = async function () { capturado = this; return "local"; };
  require("../src/index.js");
  Client.prototype.login = loginOriginal;
  if (!capturado) throw new Error("nao capturou o client");
  const client = capturado;
  const store2 = require("../src/utils/autoRespostaStore");
  await client.emit("interactionCreate", interSelect);
  const aposSelect = store2.canais(g);
  const adicionou = aposSelect.includes("222");
  console.log(adicionou ? "OK handler select adiciona canal" : "FALHA adicionar: " + JSON.stringify(aposSelect));
  if (!adicionou) process.exit(1);

  // 3. Select de novo remove
  await client.emit("interactionCreate", interSelect);
  const removido = !store2.canais(g).includes("222");
  console.log(removido ? "OK handler select remove canal" : "FALHA remover: " + JSON.stringify(store2.canais(g)));
  if (!removido) process.exit(1);

  // 4. Botao cancelar
  const interCanc = { ...interSelect, isStringSelectMenu: () => false, isButton: () => true, customId: "autorespcanal:cancelar", values: undefined };
  await client.emit("interactionCreate", interCanc);
  const cancelou = String(proxResposta.content || "").includes("ancelada");
  console.log(cancelou ? "OK handler cancelar" : "FALHA cancelar: " + JSON.stringify(proxResposta));
  if (!cancelou) process.exit(1);

  try { fs.rmSync(arq); } catch (e) {}
  console.log("TESTE-CANAL-OK");
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
