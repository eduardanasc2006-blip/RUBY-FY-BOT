/* Teste do fluxo real de /mensagem: command -> painel -> editar msg -> preview -> escolher canal -> publicar */
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

const cmdMensagem = require("../src/commands/mensagem");
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
function interacaoDe(customId, tipo = "button", extras = {}) {
  return {
    customId,
    user: author,
    member: membro,
    guild,
    channel: canal,
    guildId: guild.id,
    channelId: canal.id,
    fields: { getTextInputValue: (k) => ((extras.campos || {})[k] || "") },
    values: extras.valores || [],
    options: extras.options || { getString: () => null, getAttachment: () => null },
    isButton: () => tipo === "button",
    isModalSubmit: () => tipo === "modal",
    isStringSelectMenu: () => tipo === "select",
    isRoleSelectMenu: () => tipo === "roleselect",
    isAnySelectMenu: () => tipo === "select",
    isChatInputCommand: () => tipo === "command",
    isRepliable: () => true,
    deferred: false,
    replied: false,
    update: async (p) => { ultima = p; },
    reply: async (p) => { ultima = p; },
    deferReply: async () => {},
    followUp: async (p) => { ultima = p; },
    showModal: async (m) => { ultima = { modal: m }; },
    editReply: async (p) => { ultima = p; },
    client,
  };
}
const flush = () => new Promise((r) => setImmediate(r));

(async () => {
  let ok = true;
  // 1) Comando /mensagem
  const cmdInt = interacaoDe("mensagem", "command");
  await cmdMensagem.execute(cmdInt).catch((e) => { console.log("ERRO no comando:", e); ok = false; });
  await flush();
  const painel = ultima;
  console.log("1) /mensagem abre painel:", painel && Array.isArray(painel.components) ? "OK" : "FALHOU: " + JSON.stringify(painel));

  // 2) Botão "📝 Mensagem" abre modal
  client.emit("interactionCreate", interacaoDe(`msgpainel:mensagem:${author.id}`));
  await flush();
  console.log("2) Botão mensagem abre modal:", ultima && ultima.modal ? "OK" : "FALHOU: " + JSON.stringify(ultima));

  // 3) Submit do modal com texto
  client.emit("interactionCreate", interacaoDe(`msgmodal:mensagem:${author.id}`, "modal", { campos: { valor: "Teste de mensagem" } }));
  await flush();
  console.log("3) Modal salva texto:", ultima && ultima.embeds ? "OK" : "FALHOU: " + JSON.stringify(ultima));

  // 4) Botão preview
  client.emit("interactionCreate", interacaoDe(`msgpainel:preview:${author.id}`));
  await flush();
  console.log("4) Preview:", ultima && ultima.embeds && ultima.embeds.length ? "OK" : "FALHOU: " + JSON.stringify(ultima));

  // 5) Botão publicar
  client.emit("interactionCreate", interacaoDe(`msgpainel:publicar:${author.id}`));
  await flush();
  console.log("5) Publicar mostra seletor de canal:", ultima && ultima.components ? "OK" : "FALHOU: " + JSON.stringify(ultima));

  // 6) Selecionar canal e publicar
  canal.enviado = null;
  client.emit("interactionCreate", interacaoDe(`msgcanal:${author.id}`, "select", { valores: [canal.id] }));
  await flush();
  await flush();
  console.log("6) Publicou no canal:", canal.enviado ? `OK (msg: ${canal.enviado.content})` : "FALHOU: nada enviado | " + JSON.stringify(ultima));

  console.log(ok ? "MENSAGEM-FLUXO-OK" : "MENSAGEM-FLUXO-FALHOU");
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error("ERRO:", e.stack || e); process.exit(1); });