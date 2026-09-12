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
const RESULTADOS = [];
function registrar(nome, ok, detalhe) {
  RESULTADOS.push({ nome, ok: Boolean(ok), detalhe });
  console.log((ok ? "[OK] " : "[FALHA] ") + nome + (detalhe ? " -> " + detalhe : ""));
}
const canal = {
  id: "222222222222222222",
  name: "comandos",
  isTextBased: () => true,
  isVoiceBased: () => false,
  permissionsFor: () => ({ has: () => true, missing: () => [] }),
  guild: null,
  send: async (payload) => { canal.ultimaMensagemEnviada = payload; return { id: "m1" }; },
  reply: async () => {},
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
const membrosCache = new Map();
const guild = {
  id: "111111111111111111",
  name: "F.Y SERVER",
  channels: { cache: colecaoCanais },
  members: { me: { id: "1509146932478476389", permissions: { has: () => true } }, cache: membrosCache },
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
  manageable: true,
  kickable: true,
  bannable: true,
  guild,
};
membrosCache.set(membro.id, membro);
const author = { id: "111111111111111111", bot: false, username: "admin-teste" };
function fazerMensagem(conteudo) {
  return {
    guild,
    member: membro,
    author,
    content: conteudo,
    channel: canal,
    mentions: { channels: { first: () => null }, roles: { first: () => null }, users: { first: () => null } },
    attachments: { first: () => undefined, values: () => [], size: 0, map: () => [] },
    reply: async (payload) => { canal.ultimaResposta = payload; return payload; },
    delete: async () => {},
    client,
  };
}
function fazerInteracao(tipo, customId, extras) {
  const base = {
    customId,
    user: author,
    member: membro,
    guild,
    channel: canal,
    guildId: guild.id,
    channelId: canal.id,
    fields: { getTextInputValue: (campo) => (extras?.campos || {})[campo] || "" },
    values: extras?.valores || [],
    isButton: () => tipo === "button",
    isModalSubmit: () => tipo === "modal",
    isStringSelectMenu: () => tipo === "select",
    isRoleSelectMenu: () => tipo === "roleselect",
    isChannelSelectMenu: () => tipo === "channelSelect",
    isUserSelectMenu: () => tipo === "userSelect",
    isAnySelectMenu: () => ["select", "roleselect", "channelSelect", "userSelect"].includes(tipo),
    isChatInputCommand: () => false,
    isRepliable: () => true,
    deferred: false,
    replied: false,
    repliedDeferred: false,
    update: async (payload) => { canal.ultimaInteracao = payload; },
    reply: async (payload) => { canal.ultimaInteracao = payload; },
    deferReply: async () => { base.deferred = true; },
    followUp: async (payload) => { canal.ultimaInteracao = payload; },
    showModal: async (modal) => { canal.ultimoModal = modal; },
    component: extras?.component,
    options: { getString: () => null, getInteger: () => null, getBoolean: () => null, getChannel: () => canal },
    client,
  };
  return base;
}
async function emitir(tipo, customId, extras) {
  try {
    await client.emit("interactionCreate", fazerInteracao(tipo, customId, extras));
    return { erro: null };
  } catch (e) {
    return { erro: e };
  }
}
async function testarPrefixos() {
  const nomes = [...client.prefixCommands.keys()].filter(function (n) { return n.indexOf(" ") === -1; });
  const unicos = [...new Set(nomes)].sort();
  console.log("\n=== COMANDOS DE PREFIXO (" + unicos.length + " unicos) ===");
  for (const nome of unicos) {
    const cmd = client.prefixCommands.get(nome);
    const msg = fazerMensagem("!" + nome);
    try {
      await cmd.execute(msg, [], client);
      registrar("!" + nome + " [prefixo]", true);
    } catch (e) {
      registrar("!" + nome, false, "ERRO: " + (e?.message || e));
    }
  }
}
function interacaoValida(e) {
  return !e?.erro;
}
async function testarInteracoes() {
  console.log("\n=== INTERACOES (todos os customIds) ===");
  const casos = [
    ["button", "panel:taxas"],
    ["button", "panel:robux"],
    ["modal", "modal:robux", { campos: { valor: "500" } }],
    ["modal", "modal:reais", { campos: { valor: "10,50" } }],
    ["modal", "modal:gamepass", { campos: { valor: "1000" } }],
    ["button", "painelcenter:inicio"],
    ["button", "painelcenter:voltar"],
    ["button", "painelcenter:admin"],
    ["button", "painelcenter:conversor"],
    ["button", "painelcenter:estoque"],
    ["button", "painelcenter:dm"],
    ["select", "painelcenter:selcanal:xxx", { valores: [canal.id] }],
    ["button", "painelcenter:selcanal:xxx:cancelar"],
    ["button", "painelcat:lista"],
    ["button", "estadm:lista"],
    ["button", "estfixo:cat:xxx"],
    ["button", "estfixo:prev:xxx"],
    ["button", "estfixo:next:xxx"],
    ["button", "estfixo:voltar"],
    ["select", "painelcat:selcat:xxx", { valores: ["0"] }],
    ["select", "estadm:selprod:xxx", { valores: ["0"] }],
    ["modal", "estmodal:addcat", { campos: { nome: "NovaCategoria" } }],
    ["modal", "estmodal:addprod", { campos: { nome: "NovoProduto", valor: "100", qtd: "5", controlarQtd: "sim" } }],
    ["button", "custom:copy:xxxx"],
    ["select", "gerencmd:editar", { valores: ["0"] }],
    ["button", "gerencmd:confirm:apagar:xxxx"],
    ["button", "gerencmd:cancel"],
    ["modal", "gerencmd:editmodal:nomeoriginal", { campos: { nome: "novo", mensagem: "ola", titulo: "Meu Titulo" } }],
    ["button", "perm:voltar"],
    ["button", "perm:cargos:xxx"],
    ["select", "perm:cargos:xxx", { valores: ["0"] }],
    ["button", "embedpainel:cortitulo:xxxx"],
    ["button", "embedpainel:preview:xxxx"],
    ["button", "embedpainel:salvar:xxxx"],
    ["button", "embedpainel:cor:xxxx"],
    ["button", "embedpainel:imagem:xxxx"],
    ["button", "embedpainel:thumbnail:xxxx"],
    ["button", "embedpainel:rodape:xxxx"],
    ["button", "embedpainel:descricao:xxxx"],
    ["button", "embedpainel:voltar:xxxx"],
    ["button", "embedpainel:canal:xxxx"],
    ["button", "embedpainel:campo:remover:0"],
    ["select", "embedpainel:fieldsel:xxxx", { valores: ["0"] }],
    ["select", "embedpainel:botaosel:xxxx", { valores: ["0"] }],
    ["select", "embedpainel:botpagsel:xxxx", { valores: ["0"] }],
    ["select", "embedpainel:botpagdel:xxxx", { valores: ["0"] }],
    ["roleselect", "embedpainel:selcargos:xxxx", { valores: ["0"] }],
    ["modal", "embedmodal:titulo", { campos: { valor: "Titulo Teste" } }],
    ["modal", "embedmodal:descricao", { campos: { valor: "Descricao teste" } }],
    ["modal", "embedmodal:cor", { campos: { valor: "#FF5500" } }],
    ["modal", "embedmodal:imagem", { campos: { valor: "https://exemplo.com/i.png" } }],
    ["modal", "embedmodal:thumbnail", { campos: { valor: "https://exemplo.com/t.png" } }],
    ["modal", "embedmodal:rodape", { campos: { valor: "Rodape teste" } }],
    ["modal", "embedmodal:fieldnew", { campos: { fname: "Campo", fvalue: "Valor", finline: "nao" } }],
    ["modal", "embedmodal:botaosave:xxxx", { campos: { rotulo: "Regras", emoji: "📜", estilo: "secundario", acao: "link", valor: "cttopen:xxxx" } }],
    ["modal", "embedmodal:botaosave:xxxx:0", { campos: { rotulo: "Regras", emoji: "📜", estilo: "secundario", acao: "privado", valor: "" } }],
    ["button", "cttopen:tokenfake"],
    ["button", "modelos:lista:xxxx"],
    ["button", "modelos:voltar:xxxx"],
    ["modal", "modeloscat:nova:xxxx", { campos: { nome: "ModeloTeste" } }],
    ["modal", "modeloscat:renomear:xxxx:0", { campos: { nome: "ModeloRenomeado" } }],
    ["button", "modelos:editar:xxxx:xxxx"],
    ["modal", "embedmodal:modeloed:xxxx:xxxx:xxxx", { campos: { mnome: "ModeloEditado", mcategoria: "ModeloTeste", mdesc: "Descricao interna editada" } }],
    ["button", "msgescolha:embed:xxxx"],
    ["button", "msgescolha:normal:xxxx"],
    ["button", "msgpainel:voltar:xxxx"],
    ["modal", "msgmodal:mensagem", { campos: { valor: "Ola mundo" } }],
    ["button", "msgpainel:canal:xxxx"],
    ["select", "msgcanal:xxxx", { valores: [canal.id] }],
    ["button", "msgcanal:xxxx:cancelar"],
    ["button", "lockconf:sim:xxxx"],
    ["button", "lockconf:nao:xxxx"],
    ["button", "unlockconf:sim:xxxx"],
    ["button", "unlockconf:nao:xxxx"],
    ["button", "welcome:ativar:xxxx"],
    ["button", "welcome:desativar:xxxx"],
    ["button", "welcome:tipo:xxxx"],
    ["button", "welcome:variaveis:xxxx"],
    ["button", "welcome:salvar:xxxx"],
    ["button", "welcome:padrao:xxxx"],
    ["button", "welcome:preview:xxxx"],
    ["button", "welcome:editar:mensagem:xxxx"],
    ["modal", "welcome:modal:mensagem:xxxx", { campos: { valor: "Ola <user>!" } }],
    ["button", "welcome:editar:embed:xxxx"],
    ["button", "welcome:embed:voltar:xxxx"],
    ["button", "welcome:embed:fields:xxxx"],
    ["button", "welcome:embed:timestamp:xxxx"],
    ["modal", "welcome:modal:titulo:xxxx", { campos: { valor: "Titulo" } }],
    ["modal", "welcome:modal:cor:xxxx", { campos: { valor: "#beb6ff" } }],
    ["modal", "welcome:modal:descricao:xxxx", { campos: { valor: "Desc" } }],
    ["modal", "welcome:modal:imagem:xxxx", { campos: { valor: "https://exemplo.com/i.png" } }],
    ["modal", "welcome:modal:thumbnail:xxxx", { campos: { valor: "https://exemplo.com/t.png" } }],
    ["modal", "welcome:modal:rodape:xxxx", { campos: { valor: "Rodape" } }],
    ["button", "welcome:fieldadd:xxxx"],
    ["modal", "welcome:modal:fieldnew:xxxx", { campos: { fname: "Campo", fvalor: "Valor", finline: "nao" } }],
    ["select", "welcome:fieldsel:xxxx", { valores: ["0"] }],
    ["button", "welcome:fieldclear:xxxx"],
    ["button", "welcome:canal:xxxx"],
    ["button", "welcome:canalsel:xxxx:cancelar"],
    ["select", "welcome:canalsel:xxxx", { valores: [canal.id] }],
    ["button", "welcome:canalsel:xxxx:atual"],
    ["select", "autoresp:editar", { valores: ["0"] }],
    ["modal", "autoresp:editmodal:palavra", { campos: { palavra: "NovaPalavra", resposta: "Nova resposta" } }],
    ["select", "autorespcanal", { valores: [canal.id] }],
    ["button", "autorespcanal:cancelar"],
    ["button", "autorespcanal:atual"],
    ["select", "autoresp:acao", { valores: ["adicionar"] }],
    ["modal", "autoresp:addmodal", { campos: { palavra: "Teste", resposta: "Resposta de teste" } }],
    ["select", "autoresp:remover", { valores: ["0"] }],
    ["button", "autoresp:limparsim"],
    ["button", "autoresp:limparnao"],
    ["button", "comp:cat:xxxx"],
    ["button", "comp:voltar"],
    ["button", "comp:prod:xxxx:xxxx"],
    ["button", "comp:qtd:xxxx:xxxx:2"],
    ["button", "comp:confirmar:xxxx"],
    ["button", "comp:cancelar:xxxx"],
    ["button", "metaspainel:add:111111111111111111"],
    ["button", "metaspainel:edit:xxxx:111111111111111111"],
    ["button", "metaspainel:rm:xxxx:111111111111111111"],
    ["button", "metaspainel:refresh:111111111111111111"],
    ["button", "metaspainel:cancel:111111111111111111"],
    ["roleselect", "metaspainel:role:add:111111111111111111", { valores: ["0"] }],
    ["roleselect", "metaspainel:role:edit:xxxx:111111111111111111", { valores: ["0"] }],
    ["select", "metaspainel:tipo:add:xxxx:111111111111111111", { valores: ["vendas"] }],
    ["select", "metaspainel:tipo:edit:xxxx:xxxx:111111111111111111", { valores: ["valor"] }],
    ["modal", "metasmodal:add:vendas:xxxx:111111111111111111", { campos: { meta: "10" } }],
    ["modal", "metasmodal:edit:vendas:xxxx:xxxx:111111111111111111", { campos: { meta: "50" } }],
  ];
  let okTotal = 0;
  let falhas = 0;
  for (const [tipo,id,extra] of casos) {
    const e = await emitir(tipo,id,extra);
    if (interacaoValida(e)) {
      registrar(id + " [" + tipo + "]", true);
      okTotal++;
    } else {
      registrar(id + " [" + tipo + "]", false, "ERRO: " + (e.erro?.message || e.erro));
      falhas++;
    }
  }

  // --- Fluxo do /proof com modal + selects + confirmar (admin) ---
  const proofStore = require("../src/utils/proofStore");

  // botão do !proof abre o modal (precisa de rascunho)
  proofStore.definir(guild.id, canal.id);
  proofStore.salvarRascunho(author.id, { urls: ["https://cdn.discordapp.com/attachments/1/1/a.png"], nomes: ["a.png"], canalPadrao: canal.id });
  {
    const e = await emitir("button", "proofiniciar");
    if (interacaoValida(e) && canal.ultimoModal?.data?.custom_id === "proofmodal") {
      registrar("proofiniciar [abre modal]", true);
      okTotal++;
    } else {
      registrar("proofiniciar", false, "ERRO: " + (e.erro?.message || e.erro || "nao abriu modal"));
      falhas++;
    }
  }
  proofStore.limparRascunho(author.id);
  proofStore.salvarRascunho(author.id, {
    urls: ["https://cdn.discordapp.com/attachments/1/1/a.png", "https://cdn.discordapp.com/attachments/1/1/b.png"],
    nomes: ["a.png", "b.png"],
    canalPadrao: canal.id,
  });
  {
    // modal → deve responder com o painel (selects), sem postar ainda
    const e = await emitir("modal", "proofmodal", { campos: { numero: "26", produto: "Testando", valor: "3,00" } });
    const painel = canal.ultimaInteracao || {};
    const temSeletores = Array.isArray(painel.components) && painel.components.length >= 3;
    if (!e.erro && temSeletores) {
      registrar("proofmodal [PAINEL OK]", true);
      okTotal++;
    } else {
      registrar("proofmodal", false, "ERRO: " + (e.erro?.message || e.erro || "sem painel") + " | resp: " + JSON.stringify(painel).slice(0, 150));
      falhas++;
    }
  }
  {
    // selecionar cliente (UserSelect) e canal (ChannelSelect) → update do painel
    const e = await emitir("userSelect", "proofsel:cliente", { valores: [author.id] });
    if (interacaoValida(e)) registrar("proofsel:cliente [select]", true); else { registrar("proofsel:cliente", false, "ERRO: " + (e.erro?.message || e.erro)); falhas++; }
    const e2 = await emitir("channelSelect", "proofsel:canal", { valores: [canal.id] });
    if (interacaoValida(e2)) registrar("proofsel:canal [select]", true); else { registrar("proofsel:canal", false, "ERRO: " + (e2.erro?.message || e2.erro)); falhas++; }
  }
  {
    // confirmar → posta no canal com as imagens
    const e = await emitir("button", "proofsel:confirmar");
    const enviada = canal.ultimaMensagemEnviada?.content || "";
    if (!e.erro && enviada.includes("# PROOF #26") && canal.ultimaMensagemEnviada?.files?.length === 2) {
      registrar("proofsel:confirmar [POSTA PROOF OK]", true, enviada.replace(/\n/g, " | "));
      okTotal++;
    } else {
      registrar("proofsel:confirmar", false, "ERRO: " + (e.erro?.message || e.erro || "nao postou") + " | enviada: " + JSON.stringify(enviada));
      falhas++;
    }
  }
  // --- Fluxo com cliente "fora do Discord" (nome de plataforma) ---
  proofStore.salvarRascunho(author.id, {
    urls: ["https://cdn.discordapp.com/attachments/1/1/c.png"],
    nomes: ["c.png"],
    canalPadrao: canal.id,
  });
  {
    const e = await emitir("modal", "proofmodal", { campos: { numero: "28", produto: "Testando", valor: "3,00" } });
    if (e.erro || !interacaoValida(e)) { falhas++; registrar("proofmodal plataforma", false, "falhou ao abrir painel"); }
  }
  {
    // botão "Fora do Discord" → abre modal para digitar o nome
    const e = await emitir("button", "proofsel:plataforma");
    if (!e.erro && canal.ultimoModal?.data?.custom_id === "proofsel:plataformamodal") {
      registrar("proofsel:plataforma [abre modal]", true);
      okTotal++;
    } else {
      registrar("proofsel:plataforma", false, "ERRO: " + (e.erro?.message || e.erro || "nao abriu modal"));
      falhas++;
    }
  }
  {
    // digita o nome da plataforma → painel atualizado com Cliente: Instagram
    const e = await emitir("modal", "proofsel:plataformamodal", { campos: { clienteNome: "Instagram" } });
    const painel = canal.ultimaInteracao || {};
    const desc = (painel.embeds?.[0]?.data?.description || "");
    if (!e.erro && desc.includes("👤 Cliente: Instagram") && !desc.includes("🆔 ID")) {
      registrar("proofsel:plataformamodal [cliente plataforma]", true, desc.replace(/\n/g, " | "));
      okTotal++;
    } else {
      registrar("proofsel:plataformamodal", false, "ERRO: " + (e.erro?.message || e.erro || "nao atualizou") + " | desc: " + desc.slice(0, 150));
      falhas++;
    }
  }
  {
    // confirmar → posta com o nome da plataforma no lugar da menção
    const e = await emitir("button", "proofsel:confirmar");
    const enviada = canal.ultimaMensagemEnviada?.content || "";
    if (!e.erro && enviada.includes("👤 Cliente: Instagram") && !enviada.includes("🆔 ID") && !enviada.includes("<@")) {
      registrar("proofsel:confirmar [POSTA COM PLATAFORMA OK]", true, enviada.replace(/\n/g, " | "));
      okTotal++;
    } else {
      registrar("proofsel:confirmar plataforma", false, "ERRO: " + (e.erro?.message || e.erro || "nao postou") + " | enviada: " + JSON.stringify(enviada));
      falhas++;
    }
  }

  // sem rascunho (imagens expiradas) deve responder erro, sem crash
  proofStore.limparRascunho(author.id);
  {
    const e = await emitir("modal", "proofmodal", { campos: { numero: "27", produto: "X", valor: "" } });
    if (interacaoValida(e)) registrar("proofmodal sem rascunho", true); else falhas++;
  }
  proofStore.desativar(guild.id); // não deixar guild de teste no proofs.json real

  console.log("\nInteracoes: " + okTotal + " ok," + falhas + " falhas");
  return falhas === 0;
}
(async () => {
  await testarPrefixos();
  const okI = await testarInteracoes();
  const erros = RESULTADOS.filter((r) => !r.ok);
  console.log("\n========== RESUMO ==========");
  console.log("Total testes: " + RESULTADOS.length);
  const okComandos = RESULTADOS.filter((r) => r.ok && !r.detalhe).length;
  console.log("Comandos OK: " + okComandos + "/" + client.prefixCommands.size);
  console.log("Erros: " + erros.length);
  if (erros.length) {
    for (const e of erros.slice(0, 20)) {
      console.log("  - " + e.nome + ": " + e.detalhe);
    }
  }
  if (!okI || erros.length > 0) process.exit(1);
  console.log("\nSMOKE TESTE COMPLETO: TODOS OS HANDLERS RESPONDERAM SEM ERRO");
})().catch((e) => {
  console.error("ERRO FATAL:", e);
  process.exit(1);
});
