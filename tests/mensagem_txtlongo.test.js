/* Verifica que texto longo (>2000) não deixa o /mensagem "carregando":
 * o content no painel deve ser truncado para null (resumo na embed). */
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

const comando = client.commands.get("mensagem");
if (!comando) throw new Error("comando mensagem nao carregado");

const canal = {
  id: "222",
  isTextBased: () => true,
  isThread: () => false,
  isVoiceBased: () => false,
  permissionsFor: () => ({ has: () => true }),
  send: async (p) => { canal.enviado = p; return { id: "m" }; },
};
const colecaoCanais = {
  get: () => canal,
  filter: () => colecaoCanais,
  sort: () => colecaoCanais,
  first: () => [canal],
  map: () => [],
  size: 1,
};
const guild = {
  id: "111",
  channels: { cache: colecaoCanais },
  members: { me: { permissions: { has: () => true } } },
};
canal.guild = guild;
canal.client = client;
const membro = {
  id: "111",
  user: { id: "111", bot: false },
  permissions: { has: () => true, missing: () => [] },
  roles: { cache: new Map() },
  guild,
};
const user = { id: "111", bot: false };

let log = [];
function inter(opts) {
  const o = new Map();
  const inter = {
    customId: "",
    user,
    member: membro,
    guild,
    channel: canal,
    guildId: "111",
    channelId: "222",
    commandName: "mensagem",
    options: {
      getString: (k) => o.get(k)?.value ?? null,
      getAttachment: (k) => o.get(k)?.attachment ?? null,
    },
    isChatInputCommand: () => true,
    isButton: () => false,
    isModalSubmit: () => false,
    isStringSelectMenu: () => false,
    isAnySelectMenu: () => false,
    isRepliable: () => true,
    deferred: false,
    replied: false,
    deferReply: async () => { inter.deferred = true; log.push("deferReply"); },
    editReply: async (p) => { log.push("editReply contentLen=" + (p.content?.length ?? 0)); },
    followUp: async (p) => { log.push("followUp contentLen=" + (p.content?.length ?? 0)); },
    reply: async (p) => { log.push("reply"); inter.replied = true; log.push("replyContent=" + (p.content?.length ?? 0)); },
    update: async (p) => {},
    showModal: async () => {},
  };
  for (const [k, v] of Object.entries(opts)) o.set(k, v);
  return inter;
}
const flush = () => new Promise((r) => setImmediate(r));

(async () => {
  // 1) texto curto
  log = [];
  await comando.execute(inter({ mensagem: { value: "Oi" } }));
  await flush();
  const curtoOK = log.includes("deferReply") && log.includes("editReply contentLen=2");
  console.log("1) texto curto:", curtoOK ? "OK" : "FALHOU: " + log.join(","));

  // 2) texto longo
  log = [];
  await comando.execute(inter({ mensagem: { value: "A".repeat(2500) } }));
  await flush();
  const longoOK = log.includes("deferReply") && log.includes("editReply contentLen=0"); // content truncado p/ null
  console.log("2) texto longo (2500):", longoOK ? "OK (content truncado)" : "FALHOU: " + log.join(","));

  // 3) imagem
  log = [];
  await comando.execute(inter({ imagem: { attachment: { url: "https://x.com/a.png", contentType: "image/png" } } }));
  await flush();
  const imgOK = log.includes("deferReply") && log.includes("editReply contentLen=0");
  console.log("3) imagem:", imgOK ? "OK" : "FALHOU: " + log.join(","));

  console.log(curtoOK && longoOK && imgOK ? "MENSAGEM-TXTLONGO-OK" : "MENSAGEM-TXTLONGO-FALHOU");
  process.exit(curtoOK && longoOK && imgOK ? 0 : 1);
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });