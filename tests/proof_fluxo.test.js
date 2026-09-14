// Harness: executa o fluxo real do !proof (messageCreate + interactionCreate)
// usando os handlers carregados do src/index.js. NÃO conecta no Discord.

process.env.DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN || "fake-token";
process.env.PREFIX = process.env.PREFIX || "!";

const { Client } = require("discord.js");
const proofStore = require("../src/utils/proofStore");

let capturado = null;
const loginOriginal = Client.prototype.login;
Client.prototype.login = async function () {
  capturado = this;
  return "local";
};

require("../src/index.js");
Client.prototype.login = loginOriginal;

if (!capturado) {
  console.error("FALHA: nao capturou o client");
  process.exit(1);
}

const GUILD_ID = "111111111111111111";

const canal = {
  id: "333333333333333333",
  guildId: GUILD_ID,
  isTextBased: () => true,
  isThread: () => false,
  isVoiceBased: () => false,
  isDMBased: () => false,
  send: async () => ({ id: "msg-enviada" }),
};
canal.guild = { id: GUILD_ID };

const colecao = {
  get: () => canal,
  filter: () => colecao,
  sort: () => colecao,
  first: () => [],
  size: 1,
  forEach: () => {},
};

const guild = {
  id: GUILD_ID,
  channels: { cache: colecao, fetch: async () => canal },
  roles: { cache: new Map() },
  members: { me: { permissions: { has: () => true } } },
};

const member = {
  id: "222222222222222222",
  user: { id: "222222222222222222" },
  permissions: { has: () => true, missing: () => [] },
  roles: { cache: new Map() },
};

const author = { id: "222222222222222222", bot: false, username: "teste" };

function fakeAnexo(url, nome) {
  return { url, name: nome, contentType: "image/png", attachment: url };
}

const URL1 = "https://cdn.discordapp.com/attachments/333/1/prova.png";
const URL2 = "https://cdn.discordapp.com/attachments/333/2/prova2.png";

function fazerMensagem(conteudo) {
  return {
    guild,
    member,
    author,
    content: conteudo,
    channel: canal,
    guildId: GUILD_ID,
    channelId: canal.id,
    attachments: {
      values: () => [fakeAnexo(URL1, "prova.png"), fakeAnexo(URL2, "prova2.png")],
      size: 2,
      first: () => fakeAnexo(URL1, "prova.png"),
    },
    mentions: { channels: { first: () => null }, roles: { first: () => null }, users: { first: () => null } },
    reply: async (payload) => { canal.ultimaResposta = payload; return payload; },
    delete: async () => {},
    client: capturado,
  };
}

let indexBotao = 0;
function fazerInteracao(tipo, customId, extras = {}) {
  const base = {
    id: `interacao-${indexBotao++}`,
    token: "token-fake",
    customId,
    user: author,
    member,
    guild,
    channel: canal,
    guildId: GUILD_ID,
    channelId: canal.id,
    type: 3,
    fields: {
      getTextInputValue: (campo) => (extras.campos || {})[campo] || "",
    },
    values: extras.valores || [],
    isButton: () => tipo === "button",
    isModalSubmit: () => tipo === "modal",
    isChatInputCommand: () => tipo === "slash",
    isChannelSelectMenu: () => tipo === "canalselect",
    isUserSelectMenu: () => tipo === "userselect",
    isStringSelectMenu: () => tipo === "stringselect",
    isRoleSelectMenu: () => false,
    isAnySelectMenu: () =>
      tipo === "canalselect" || tipo === "userselect" || tipo === "stringselect",
  };
  base.deferReply = async () => { base.deferred = true; };
  base.deferUpdate = async () => { base.replied = true; base.deferred = true; };
  base.editReply = async (payload) => { base.replied = true; base.ultimaResposta = payload; return payload; };
  base.update = async (payload) => {
    base.replied = true;
    base.ultimaResposta = payload;
    return payload;
  };
  base.reply = async (payload) => {
    base.replied = true;
    base.ultimaResposta = payload;
    return payload;
  };
  base.followUp = async (payload) => { base.ultimaResposta = payload; return payload; };
  base.showModal = async (modal) => { base.modal = modal; return modal; };
  base.ephemeral = true;
  return base;
}

function esperar(ms) { return new Promise((r) => setTimeout(r, ms)); }

(async () => {
  let erros = 0;
  const marcar = (nome, cond) => {
    console.log((cond ? "[OK] " : "[FAIL] ") + nome);
    if (!cond) erros++;
  };

  const msg = fazerMensagem("!proof");
  await capturado.emit("messageCreate", msg);
  await esperar(10);
  const resp = canal.ultimaResposta;
  marcar("!proof responde com embed + botao", !!(resp && resp.embeds && resp.components));

  const interab = fazerInteracao("button", "proofiniciar");
  await capturado.emit("interactionCreate", interab);
  await esperar(10);
  console.log("[debug] proofiniciar modal?", !!interab.modal, "| type:", typeof interab.modal?.toJSON);
  marcar("proofiniciar abre modal", !!(interab.modal && interab.modal.toJSON));

  // O modal real é um ModalBuilder; serializa e verifica os inputs
  const modalJSON = interab.modal?.toJSON ? interab.modal.toJSON() : (interab.modal?.data || null);
  marcar("modal tem 3 inputs", !!(modalJSON && modalJSON.components && modalJSON.components.length === 3));

  const interam = fazerInteracao("modal", "proofmodal", {
    campos: { numero: "26", produto: "Robux 500", valor: "3,00" },
  });
  await capturado.emit("interactionCreate", interam);
  await esperar(10);
  const painel1 = interam.ultimaResposta;
  marcar("proofmodal responde painel de revisao", !!(painel1 && painel1.embeds));
  marcar("painel tem seletores", !!(painel1 && painel1.components && painel1.components.length >= 3));

  const inters = fazerInteracao("canalselect", "proofsel:canal", { valores: [canal.id] });
  await capturado.emit("interactionCreate", inters);
  await esperar(10);
  const painel2 = inters.ultimaResposta;
  marcar("selecionar canal atualiza painel", !!(painel2 && painel2.embeds));

  const interam2 = fazerInteracao("button", "proofsel:confirmar");
  await capturado.emit("interactionCreate", interam2);
  await esperar(30);
  const respostaFinal = interam2.ultimaResposta;
  console.log("[debug] resposta final:", JSON.stringify(respostaFinal || {}).slice(0, 300));
  marcar("confirmar posta proof (update final ok)", !!(respostaFinal && respostaFinal.content && respostaFinal.content.includes("postado em")));

  // ---- Caso de erro: canal.send falha (ex: URL de anexo expirada) ----
  // Deve responder UMA vez com erro e limpar o fluxo, sem tentar duplicar resposta.
  proofStore.salvarRascunho(GUILD_ID, "222222222222222222", {
    urls: ["https://cdn.discordapp.com/attachments/1/1/x.png"],
    nomes: ["x.png"],
    canalPadrao: canal.id,
  });
  proofStore.definir(GUILD_ID, "444444444444444444");
  const canalFalho = {
    id: "444444444444444444",
    isTextBased: () => true,
    send: async () => { throw new Error("Cannot send an empty message"); },
  };
  canalFalho.guild = { id: GUILD_ID };
  const colecaoFalha = { get: () => canalFalho, filter: () => colecao, sort: () => colecao, first: () => [], size: 1 };
  const guildFalha = { id: GUILD_ID, channels: { cache: colecaoFalha, fetch: async () => canalFalho }, roles: { cache: new Map() }, members: { me: { permissions: { has: () => true } } } };

  const provaFalha = fazerInteracao("modal", "proofmodal", {
    campos: { numero: "29", produto: "X", valor: "1,00" },
  });
  await capturado.emit("interactionCreate", provaFalha);
  await esperar(10);

  const interaFalha = fazerInteracao("button", "proofsel:confirmar");
  interaFalha.guild = guildFalha;
  let contRespostas = 0;
  const origEdit = interaFalha.editReply;
  interaFalha.editReply = async (p) => { contRespostas++; return origEdit(p); };
  await capturado.emit("interactionCreate", interaFalha);
  await esperar(30);
  const respFalha = interaFalha.ultimaResposta;
  console.log("[debug] resp falha:", JSON.stringify(respFalha || {}).slice(0, 200), "| respostas:", contRespostas);
  marcar("falha no envio responde 1x com erro", contRespostas === 1 && !!respFalha && respFalha.content.includes("Erro ao postar"));

  console.log(erros ? `\nPROOF-FLUXO: ${erros} ERRO(S)` : "\nPROOF-FLUXO-OK");
  process.exit(erros ? 1 : 0);
})();