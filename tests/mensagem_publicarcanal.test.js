/* Foca no fluxo "Publicar -> Canal atual" com imagens:
 * - deferUpdate deve ser chamado antes de qualquer canal.send (ACK <3s)
 * - se um envio falha (URL invalida/expirada), os outros continuam e o
 *   resultado reporta a falha em vez de deixar a interacao sem resposta
 * - o handler sempre responde via editReply (depois do deferUpdate) */
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

function fazerMundo(sendImpl) {
  const canal = {
    id: "222",
    name: "comandos",
    isTextBased: () => true,
    isThread: () => false,
    isVoiceBased: () => false,
    permissionsFor: () => ({ has: () => true, missing: () => [] }),
    guild: null,
    send: sendImpl,
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
    id: "111",
    channels: { cache: colecaoCanais },
    members: { me: { id: "1509146932478476389", permissions: { has: () => true } } },
    roles: { cache: new Map() },
  };
  canal.guild = guild;
  canal.client = client;
  const membro = {
    id: "111",
    user: { id: "111", bot: false, username: "admin-teste" },
    permissions: { has: () => true, missing: () => [] },
    roles: { cache: new Map() },
    guild,
  };
  const author = { id: "111", bot: false, username: "admin-teste" };
  return { canal, guild, membro, author };
}

const flush = () => new Promise((r) => setImmediate(r));

function emitirMsgCanal(sessaoAntes, mundo, log) {
  // Usa a sessao global do bot (getSessao) preenchendo via comando anterior
  const { getSessao } = require("../src/utils/mensagemPainel");
  // limpa e preenche
  const sessao = getSessao(mundo.author.id);
  sessao.mensagem = sessaoAntes.mensagem ?? null;
  sessao.imagens = [...(sessaoAntes.imagens || [])];
  sessao.layout = sessaoAntes.layout || 'lado';

  const inter = {
    customId: `msgcanal:${mundo.author.id}:atual`,
    user: mundo.author,
    member: mundo.membro,
    guild: mundo.guild,
    channel: mundo.canal,
    guildId: "111",
    channelId: "222",
    values: [],
    isButton: () => true,
    isModalSubmit: () => false,
    isStringSelectMenu: () => false,
    isRoleSelectMenu: () => false,
    isAnySelectMenu: () => false,
    isChatInputCommand: () => false,
    isRepliable: () => true,
    deferred: false,
    replied: false,
    deferUpdate: async () => { inter.deferred = true; log.push("deferUpdate"); },
    reply: async (p) => { log.push("reply: " + JSON.stringify(p).slice(0, 80)); },
    update: async (p) => { log.push("update: " + JSON.stringify(p).slice(0, 80)); },
    editReply: async (p) => { log.push("editReply: " + JSON.stringify(p).slice(0, 120)); },
    followUp: async (p) => { log.push("followUp: " + JSON.stringify(p).slice(0, 80)); },
    client,
  };
  client.emit("interactionCreate", inter);
  return inter;
}

(async () => {
  const resultados = [];

  // --- Caso 1: (baixo) publica com 2 imagens validas ---
  {
    const log = [];
    const mundo = fazerMundo(async (p) => { log.push("canal.send"); return { id: "m" }; });
    emitirMsgCanal({ mensagem: "Ola", imagens: ["https://a.com/1.png", "https://a.com/2.png"], layout: "baixo" }, mundo, log);
    await flush(); await flush(); await flush();
    // 1 send do texto + 2 sends de imagem
    const sends = log.filter((x) => x === "canal.send").length;
    const ok = sends === 3 && log.includes("deferUpdate") && log.some((x) => x.startsWith("editReply") && x.includes("publicada") && !x.includes("falharam"));
    console.log(`1) baixo, 2 imagens validas (${sends} sends):`, ok ? "OK" : "FALHOU: " + log.join(" | "));
    resultados.push(["2 imagens validas", ok]);
  }

  // --- Caso 2: (baixo) 1 imagem valida + 1 invalida (send falha na segunda) ---
  {
    const log = [];
    let vez = 0;
    const mundo = fazerMundo(async () => {
      vez++;
      log.push(`canal.send(${vez})`);
      if (vez === 2) throw new Error("URL invalida");
      return { id: "m" };
    });
    emitirMsgCanal({ mensagem: "Ola", imagens: ["https://a.com/1.png", "https://invalida.com/x.png"], layout: "baixo" }, mundo, log);
    await flush(); await flush(); await flush();
    // 1 send do texto + 1 send imagem OK + 1 send imagem que falha
    const ok = log.includes("deferUpdate") && log.some((x) => x.startsWith("editReply") && x.includes("falharam"));
    console.log("2) baixo, imagem invalida na 2a:", ok ? "OK (continua e reporta)" : "FALHOU: " + log.join(" | "));
    resultados.push(["imagem invalida", ok]);
  }

  // --- Caso 3: (baixo) todas as imagens invalidas ---
  {
    const log = [];
    const mundo = fazerMundo(async (p) => { log.push("canal.send"); throw new Error("URL invalida"); });
    emitirMsgCanal({ mensagem: "Ola", imagens: ["https://invalida.com/x.png"], layout: "baixo" }, mundo, log);
    await flush(); await flush();
    const ok = log.includes("deferUpdate") && log.some((x) => x.startsWith("editReply") && x.includes("falharam"));
    console.log("3) baixo, imagens invalidas:", ok ? "OK (reporta)" : "FALHOU: " + log.join(" | "));
    resultados.push(["imagens invalidas", ok]);
  }

  // --- Caso 4: sem imagens, so texto ---
  {
    const log = [];
    const mundo = fazerMundo(async () => { log.push("canal.send"); return { id: "m" }; });
    emitirMsgCanal({ mensagem: "So texto", imagens: [] }, mundo, log);
    await flush(); await flush();
    const ok = log.includes("deferUpdate") && log.some((x) => x.startsWith("editReply") && x.includes("publicada"));
    console.log("4) so texto:", ok ? "OK" : "FALHOU: " + log.join(" | "));
    resultados.push(["so texto", ok]);
  }

  // --- Caso 4.1: layout lado a lado, texto+2 imagens validas = 1 send unico ---
  {
    const log = [];
    const mundo = fazerMundo(async () => { log.push("canal.send"); return { id: "m" }; });
    emitirMsgCanal({ mensagem: "Ola", imagens: ["https://a.com/1.png", "https://a.com/2.png"], layout: "lado" }, mundo, log);
    await flush(); await flush(); await flush();
    const sends = log.filter((x) => x === "canal.send").length;
    const ok = sends === 1 && log.includes("deferUpdate") && log.some((x) => x.startsWith("editReply") && x.includes("publicada") && !x.includes("falharam"));
    console.log(`4.1) lado a lado (${sends} send):`, ok ? "OK" : "FALHOU: " + log.join(" | "));
    resultados.push(["lado a lado", ok]);
  }

  // --- Caso 4.2: layout baixo (empilhadas), texto+2 imagens = 1 texto + 2 imgs ---
  {
    const log = [];
    const mundo = fazerMundo(async () => { log.push("canal.send"); return { id: "m" }; });
    emitirMsgCanal({ mensagem: "Ola", imagens: ["https://a.com/1.png", "https://a.com/2.png"], layout: "baixo" }, mundo, log);
    await flush(); await flush(); await flush();
    const sends = log.filter((x) => x === "canal.send").length;
    const ok = sends === 3 && log.includes("deferUpdate") && log.some((x) => x.startsWith("editReply") && x.includes("publicada") && !x.includes("falharam"));
    console.log(`4.2) uma abaixo da outra (${sends} sends):`, ok ? "OK" : "FALHOU: " + log.join(" | "));
    resultados.push(["empilhadas", ok]);
  }

  // --- Caso 4.3: layout lado com URL invalida no lote -> fallback 1 a 1 ---
  {
    const log = [];
    let vez = 0;
    const mundo = fazerMundo(async () => {
      vez++;
      log.push(`canal.send(${vez})`);
      // lote(1) e a 2a imagem no fallback(4) são inválidos
      if (vez === 1 || vez === 4) throw new Error("URL invalida");
      return { id: "m" };
    });
    emitirMsgCanal({ mensagem: "X", imagens: ["https://ok.com/1.png", "https://invalida.com/2.png"], layout: "lado" }, mundo, log);
    await flush(); await flush(); await flush(); await flush();
    // lote(1) falha -> texto(2) + img1(3) + img2(4, falha)
    const sends = log.filter((x) => /canal\.send\(\d+\)/.test(x)).length;
    const ok = sends === 4 && log.some((x) => x.startsWith("editReply") && x.includes("falharam"));
    console.log(`4.3) lado c/ URL invalida (${sends} sends, fallback):`, ok ? "OK" : "FALHOU: " + log.join(" | "));
    resultados.push(["lado fallback", ok]);
  }

  const falhas = resultados.filter((r) => !r[1]).length;
  console.log(falhas ? `MENSAGEM-PUBLICARCANAL-FALHOU (${falhas})` : "MENSAGEM-PUBLICARCANAL-OK");
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.error("ERRO:", e.stack || e); process.exit(1); });