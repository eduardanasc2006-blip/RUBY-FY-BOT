/* Fluxo completo do /mensagem emitido via client.emit (handlers reais do index.js + extras.js).
 * Reproduz o que o usuário faz: comando -> clica "Mensagem" -> digita -> clica Publicar -> escolhe canal. */
process.env.DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN || "fake-token";
process.env.ADMIN_IDS = "111111111111111111";
const { Client } = require("discord.js");

let capturado = null;
const loginOriginal = Client.prototype.login;
Client.prototype.login = async function () { capturado = this; return "local"; };
require("../src/index.js");
Client.prototype.login = loginOriginal;
if (!capturado) throw new Error("nao capturou client");
const client = capturado;

const canal = {
  id: "222222222222222222",
  name: "comandos",
  isTextBased: () => true,
  isThread: () => false,
  isVoiceBased: () => false,
  permissionsFor: () => ({ has: () => true, missing: () => [] }),
  guild: null,
  send: async (p) => { canal.enviado = p; return { id: "m1" }; },
};
const colecaoCanais = {
  get: (id) => (id === canal.id ? canal : null),
  filter: () => colecaoCanais,
  sort: () => colecaoCanais,
  first: () => [canal],
  map: () => [],
  size: 1,
  forEach: () => {},
};
const guild = {
  id: "111111111111111111",
  name: "F.Y SERVER",
  channels: { cache: colecaoCanais },
  members: { me: { id: "1509146932478476389", permissions: { has: () => true } } },
  roles: { cache: new Map() },
};
canal.guild = guild;
canal.client = client;
const membro = {
  id: "111111111111111111",
  user: { id: "111111111111111111", bot: false, username: "admin-teste" },
  permissions: { has: () => true, missing: () => [] },
  roles: { cache: new Map() },
  guild,
};
const author = { id: "111111111111111111", bot: false, username: "admin-teste" };

let ultima = null;
const inconsistencias = [];
let responderamContador = 0;
function baseInteracao(tipo) {
  const inter = {
    user: author,
    member: membro,
    guild,
    channel: canal,
    guildId: guild.id,
    channelId: canal.id,
    isButton: () => tipo === "button",
    isModalSubmit: () => tipo === "modal",
    isStringSelectMenu: () => tipo === "select",
    isRoleSelectMenu: () => tipo === "roleselect",
    isAnySelectMenu: () => tipo === "select",
    isChatInputCommand: () => tipo === "command",
    isRepliable: () => true,
    deferred: false,
    replied: false,
    update: async (p) => { responderamContador++; ultima = { __tipo: "update", ...p }; },
    reply: async (p) => { responderamContador++; ultima = { __tipo: "reply", ...p }; },
    deferReply: async () => { inter.deferred = true; responderamContador++; ultima = { __tipo: "deferReply" }; },
    deferUpdate: async () => { inter.deferred = true; responderamContador++; ultima = { __tipo: "deferUpdate" }; },
    followUp: async (p) => { responderamContador++; ultima = { __tipo: "followUp", ...p }; },
    showModal: async (m) => { responderamContador++; ultima = { __tipo: "modal", modal: m }; },
    editReply: async (p) => { responderamContador++; ultima = { __tipo: "editReply", ...p }; },
  };
  return inter;
}
function interacaoComando(opts) {
  const inter = baseInteracao("command");
  inter.commandName = "mensagem";
  const o = new Map();
  inter.options = {
    getString: (k) => o.get(k)?.value ?? null,
    getAttachment: (k) => o.get(k)?.attachment ?? null,
  };
  for (const [k, v] of Object.entries(opts)) o.set(k, v);
  return inter;
}
function interacaoCustom(customId, tipo, extras = {}) {
  const inter = baseInteracao(tipo);
  inter.customId = customId;
  inter.fields = { getTextInputValue: (k) => ((extras.campos || {})[k] || "") };
  inter.values = extras.valores || [];
  inter.client = client;
  return inter;
}
const flush = () => new Promise((r) => setImmediate(r));

(async () => {
  // 1) /mensagem com texto + imagem
  client.emit("interactionCreate", interacaoComando({
    mensagem: { value: "Ola mundo" },
    imagem: { attachment: { url: "https://exemplo.com/a.png", contentType: "image/png" } },
  }));
  await flush(); await flush();
  console.log("1) /mensagem (texto+imagem):", ultima?.embeds?.length ? "OK" : "FALHOU: " + JSON.stringify(ultima));

  // 2) Botão Mensagem (abre modal)
  client.emit("interactionCreate", interacaoCustom(`msgpainel:mensagem:${author.id}`, "button"));
  await flush();
  console.log("2) Botão Mensagem:", ultima?.__tipo === "modal" ? "OK" : "FALHOU: " + JSON.stringify(ultima));

  // 3) Modal salva
  client.emit("interactionCreate", interacaoCustom(`msgmodal:mensagem:${author.id}`, "modal", { campos: { valor: "Ola mundo" } }));
  await flush();
  console.log("3) Modal salva:", ultima?.__tipo === "update" ? "OK" : "FALHOU: " + JSON.stringify(ultima));

  // 3.5) Toggle de layout: default 'lado' -> alterna para 'baixo'
  const { getSessao } = require("../src/utils/mensagemPainel");
  const totalAntes = ultima && ultima.content ? ultima.content.includes("Layout") : false;
  client.emit("interactionCreate", interacaoCustom(`msgpainel:layout:${author.id}`, "button"));
  await flush();
  const sessaoAposToggle = getSessao(author.id);
  const toggleOk = sessaoAposToggle.layout === "baixo" && String(ultima?.embeds?.[0]?.data?.description || "").includes("uma abaixo da outra");
  console.log("3.5) Toggle layout p/ baixo:", toggleOk ? "OK" : "FALHOU: " + JSON.stringify(ultima));
  // volta para lado
  client.emit("interactionCreate", interacaoCustom(`msgpainel:layout:${author.id}`, "button"));
  await flush();
  const sessaoVolta = getSessao(author.id);
  const voltaOk = sessaoVolta.layout === "lado";
  console.log("3.6) Toggle layout de volta p/ lado:", voltaOk ? "OK" : "FALHOU: layout=" + sessaoVolta.layout);

  // 4) Preview
  client.emit("interactionCreate", interacaoCustom(`msgpainel:preview:${author.id}`, "button"));
  await flush();
  console.log("4) Preview:", ultima?.__tipo === "update" && ultima.embeds?.length ? "OK" : "FALHOU: " + JSON.stringify(ultima));

  // 5) Publicar (mostra seletor)
  client.emit("interactionCreate", interacaoCustom(`msgpainel:publicar:${author.id}`, "button"));
  await flush();
  console.log("5) Publicar:", ultima?.__tipo === "update" && ultima.components?.length ? "OK" : "FALHOU: " + JSON.stringify(ultima));

  // 6) Escolher canal -> publica
  const nAntes = responderamContador;
  client.emit("interactionCreate", interacaoCustom(`msgcanal:${author.id}`, "select", { valores: [canal.id] }));
  await flush(); await flush();
  console.log("6) Publicou:", canal.enviado?.content === "Ola mundo" ? "OK" : "FALHOU: " + JSON.stringify(canal.enviado));

  console.log("Total de respostas às interações:", responderamContador);
  const falha = inconsistencias.length || !canal.enviado;
  console.log(falha ? "MENSAGEM-FLUXO-REPRO-FALHOU" : "MENSAGEM-FLUXO-REPRO-OK");
  process.exit(falha ? 1 : 0);
})().catch((e) => { console.error("ERRO:", e.stack || e); process.exit(1); });