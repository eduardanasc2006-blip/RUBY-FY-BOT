/* Teste focado no fluxo real do botão privado cttopen: ( !embed ).
 * Publica a embed real com botoes via buildPainel e depois emula o clique
 * no botao, validando que TODAS as paginas aparecem juntas numa unica
 * resposta efemera, com a MESMA cor da embed publicada, sem paginacao. */

process.env.DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN || "fake-token";
process.env.ADMIN_IDS = "111111111111111111";

const { Client } = require("discord.js");

let capturado = null;
const loginOriginal = Client.prototype.login;
Client.prototype.login = async function () {
  capturado = this;
  return "local";
};

require("../src/index.js");
Client.prototype.login = loginOriginal;
if (!capturado) throw new Error("nao capturou o client");
const client = capturado;

const cttStore = require("../src/utils/cttStore");
const { buildPainel } = require("../src/utils/embedPainel");
const { MessageFlags } = require("discord.js");

const canal = {
  id: "222222222222222222",
  name: "comandos",
  isTextBased: () => true,
  isThread: () => false,
  isVoiceBased: () => false,
  permissionsFor: () => ({ has: () => true, missing: () => [] }),
  guild: null,
  reply: async (p) => { canal.ultimaResposta = p; },
  send: async (p) => { canal.ultimaResposta = p; },
  delete: async () => {},
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
  displayName: "admin-teste",
  displayAvatarURL: () => "https://cdn.discordapp.com/avatars/x/x.png",
  permissions: { has: () => true, missing: () => [] },
  roles: { cache: new Map() },
  guild,
};
const author = { id: "111111111111111111", bot: false, username: "admin-teste" };

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
    isButton: () => tipo === "button",
    isModalSubmit: () => tipo === "modal",
    isStringSelectMenu: () => tipo === "select",
    isRoleSelectMenu: () => tipo === "roleselect",
    isAnySelectMenu: () => tipo === "select",
    isChatInputCommand: () => false,
    isRepliable: () => true,
    deferred: false,
    replied: false,
    update: async (p) => { canal.ultimaInteracao = p; },
    reply: async (p) => { canal.ultimaInteracao = p; },
    deferReply: async () => {},
    followUp: async (p) => { canal.ultimaInteracao = p; },
    showModal: async (m) => { canal.ultimoModal = m; },
    client,
  };
}

async function main() {
  // 1. Sessao do !embed com 3 paginas e cor laranja
  const donorId = author.id;
  const sessoes = require("../src/utils/embedPainel");
  const sessao = sessoes.getSessao(donorId);
  Object.assign(sessao, {
    titulo: "Embed Publicada",
    descricao: "Descricao da embed publicada",
    cor: "#FF5500",
    imagem: "",
    thumbnail: "",
    rodape: "",
    campos: [],
    botoes: [],
    paginas: [
      { titulo: "Vendas", descricao: "Nao e permitida a venda entre membros nao autorizados.", fields: [], imagem: "", thumbnail: "" }
      , { titulo: "Chats", descricao: "Nao e permitido spam.", fields: [], imagem: "", thumbnail: "" }
      , { titulo: "Respeito", descricao: "E obrigatorio manter o respeito.", fields: [], imagem: "", thumbnail: "" }
    ]
  });

  // 2. Publica a embed com os botoes ( fluxo real). O botao privado
  // "📜 Regras" vira cttopen:guild:token com payload registrado.
  sessao.botoes = [
    { rotulo: "📜 Regras", acao: "privado", valor: "", paginas: sessao.paginas }
  ];
  const publicada = sessoes.buildPreview(donorId, guild.id);
  const linhaBotao = (publicada.components || []).find((r) => (r.components || []).some((c) => (c.data?.custom_id || "" ).startsWith("cttopen:")));
  if (!linhaBotao) throw new Error("Nao achou botao cttopen na embed publicada");
  const botao = linhaBotao.components.find((c) => (c.data.custom_id || "" ).startsWith("cttopen:"));
  if (!botao) throw new Error("Nao achou o botao cttopen");
  const customIdDoBotao = botao.data.custom_id;

  // 3. Clica no botao ( emula o interactionCreate real)
  await client.emit("interactionCreate", interacaoDe(customIdDoBotao));

  //  4. Valida a resposta efemera
  const resp = canal.ultimaInteracao;
 (await canal.ultimaInteracao);
  if (!resp) {
    console.log("[FALHA] cttopen nao respondeu");
    process.exit(1);
  }
  const flags = resp.flags ?? 0;
  const ehEfemera = (flags !== undefined && flags !== null && Number(flags ?? 0)) === (1 << 6);
  const embeds = resp.embeds || [];
  const titulos = embeds.map((e) => (e.data?.title || e.title || "" ));
  const cores = embeds.map((e) => (e.data?.color ?? e.color ?? null));
  const queridoh = [
    ["Vendas", 0xFF5500],
    ["Chats", 0xFF5500],
    ["Respeito", 0xFF5500]
  ];

  let ok = true;
  if (!ehEfemera) { console.log("[FALHA] resposta nao e efemera. flags=" + flags); ok = false; }
  if (embeds.length !== 3) { console.log("[FALHA] esperava 3 embeds, veio " + embeds.length); ok = false; }
  queridoh.forEach(([tit, cor], i) => {
    if ((titulos[i] || "" ) !== tit) { console.log("[FALHA] embed " + i + " titulo esperado " + tit + " veio " + titulos[i]); ok = false; }
    if (cores[i] !== cor) { console.log("[FALHA] embed " + i + " cor esperada " + cor + " veio " + cores[i]); ok = false; }
  });
  const temPaginacao = JSON.stringify(resp).includes("cttpag:") || JSON.stringify(resp).includes("Página") || JSON.stringify(resp).includes("Avançar");
  if (temPaginacao) { console.log("[FALHA] resposta contem paginacao"); ok = false; }
  const temBotaoEditar = (resp.components || []).length > 0;
  if (temBotaoEditar) {
    const custom = ((resp.components[0].components || []) [0]?.data?.custom_id || "" ) ;
    if (!custom.startsWith("cttopen:")) { console.log("[FALHA] unico componente deveria ser cttopen:editar"); ok = false; }
  }

  if (ok) {
    console.log("[OK] botao privado: " + embeds.length + " embeds em sequencia, cor " + cores[0].toString(16) + ", sem paginacao, efemera=true");
  } else {
    console.log(JSON.stringify({ titulos, cores, flags, components: resp.components?.length, embeds: resp.embeds?.length }, null, 2));
    process.exit(1);
  }
}

main().catch((e) => { console.error("ERRO FATAL:", e); process.exit(1); });