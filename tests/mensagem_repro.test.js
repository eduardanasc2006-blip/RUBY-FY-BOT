/* Reproduz o erro real do /mensagem: emitindo a interação via client.emit
 * (passa pelo handler real do index.js), com texto e com imagem. */
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
const clientCommands = client.commands;

const resultados = [];
let ultima = null;
function interacaoDe(customId, tipo = "button", extras = {}) {
  const inter = {
    customId,
    user: author,
    member: membro,
    guild,
    channel: canal,
    guildId: guild.id,
    channelId: canal.id,
    fields: { getTextInputValue: (k) => ((extras.campos || {})[k] || "") },
    values: extras.valores || [],
    options: extras.options || new Map([], {
      getString: () => null,
      getAttachment: () => null,
    }),
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
  // options estilo discord.js (Collection + getters)
  const opts = new Map();
  inter.options.get = (k) => opts.get(k);
  inter.options.getString = (k) => (opts.get(k)?.value ?? null);
  inter.options.getAttachment = (k) => (opts.get(k)?.attachment ?? null);
  inter.options._set = (k, v) => opts.set(k, v);
  return inter;
}
const flush = () => new Promise((r) => setImmediate(r));

(async () => {
  const cmd = clientCommands.get("mensagem");
  if (!cmd) { console.log("FALHOU: comando /mensagem não está em client.commands"); process.exit(1); }
  console.log("Comando /mensagem carregado: OK");

  // --- Caso 1: /mensagem com texto ---
  ultima = null;
  const i1 = interacaoDe("", "command");
  i1.commandName = "mensagem";
  i1.options._set("mensagem", { value: "teste de mensagem" });
  client.emit("interactionCreate", i1);
  await flush();
  await flush();
  const r1 = ultima;
  const ok1 = r1 && (r1.embeds || r1.content) && !(typeof r1 === "string");
  resultados.push(["com texto", ok1, r1]);
  console.log("Caso texto:", ok1 ? "OK — respondeu painel" : "FALHOU — resposta: " + JSON.stringify(r1));

  // --- Caso 2: /mensagem com imagem (anexo) ---
  ultima = null;
  const i2 = interacaoDe("", "command");
  i2.commandName = "mensagem";
  i2.options._set("imagem", { attachment: { url: "https://exemplo.com/img.png", contentType: "image/png" } });
  client.emit("interactionCreate", i2);
  await flush();
  await flush();
  const r2 = ultima;
  const ok2 = r2 && (r2.embeds || r2.content) && !(typeof r2 === "string");
  resultados.push(["com imagem", ok2, r2]);
  console.log("Caso imagem:", ok2 ? "OK — respondeu painel" : "FALHOU — resposta: " + JSON.stringify(r2));

  const falhou = resultados.filter((r) => !r[1]);
  console.log(falhou.length ? `MENSAGEM-REPRO-FALHOU (${falhou.length})` : "MENSAGEM-REPRO-OK");
  process.exit(falhou.length ? 1 : 0);
})().catch((e) => { console.error("ERRO:", e.stack || e); process.exit(1); });