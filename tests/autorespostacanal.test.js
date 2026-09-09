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
    isMentionableSelectMenu: () => false, isChatInputCommand: () => false, isContextMenuCommand: () => false, isMessageContextMenuCommand: () => false, isUserContextMenuCommand: () => false,
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


  // 5. Painel central: !autoresposta (sem respostas ainda abre painel completo
  const mPainel = await msg("!autoresposta");
  await prefixo.execute(mPainel);
  const painel = mPainel.ultimaResposta;
  const selAcao = painel.components?.[0]?.components?.[0];
  const painelSerializado = JSON.stringify(painel && painel.toJSON ? painel.toJSON() : painel);
  const painelOk = painelSerializado.includes("autoresp:acao") && painelSerializado.includes("canais");
  console.log(painelOk ? "OK painel central abre painel completo (acao + canais)" : "FALHA painel: " + JSON.stringify(painel));
  if (!painelOk) process.exit(1);

  // 6. Acao adicionar abre modal
  const interAcaoAdd = { ...interSelect, isStringSelectMenu: () => true, customId: "autoresp:acao", values: ["adicionar"] };
  let modalCapturado = null;
  interAcaoAdd.showModal = async (modal) => { modalCapturado = modal; };
  await client.emit("interactionCreate", interAcaoAdd);
  const modalJson = modalCapturado && (modalCapturado.toJSON ? modalCapturado.toJSON() : modalCapturado.data);

  const abriuModal = modalJson?.custom_id === "autoresp:addmodal:canais" && modalJson?.components?.[2]?.components?.[0]?.custom_id === "canais";
  console.log(abriuModal ? "OK acao adicionar abre modal" : "FALHA add modal: " + JSON.stringify(modalCapturado));
  if (!abriuModal) process.exit(1);

  // 7. Submetero modal adicionar cria resposta
  const interModalAdd = { ...interSelect, isStringSelectMenu: () => false, isModalSubmit: () => true, customId: "autoresp:addmodal:canais", fields: { getTextInputValue: (c) => (c === "palavra" ? "estoque" : c === "resposta" ? "veja #canal" : c === "canais" ? "222" : "") }, values: [] };
  await client.emit("interactionCreate", interModalAdd);
  const temEstoque = store2.listar(g).some((r) => r.palavra === "estoque");
const temCanais = store2.listar(g).some((r) => r.palavra === "estoque" && Array.isArray(r.canais) && r.canais.includes("222"));
console.log(temCanais ? "OK modal salva canais da resposta" : "FALHA canais na resposta: " + JSON.stringify(store2.listar(g)));
if (!temCanais) process.exit(1);
  console.log(temEstoque ? "OK modal adicionar cria resposta" : "FALHA add via modal: " + JSON.stringify(store2.listar(g)));
  if (!temEstoque) process.exit(1);

  // 8. Acao editar abre select de edicao
  const interAcaoEditar = { ...interSelect, isStringSelectMenu: () => true, customId: "autoresp:acao", values: ["editar"], update: async (payload) => { ultimoUpdate = payload; } };
  let ultimoUpdate = null;
  await client.emit("interactionCreate", interAcaoEditar);
  const abriuEditar = ultimoUpdate?.components?.[0]?.components?.[0]?.data?.custom_id === "autoresp:editar";
  console.log(abriuEditar ? "OK acao editar abre select edicao" : "FALHA editar: " + JSON.stringify(ultimoUpdate));
  if (!abriuEditar) process.exit(1);

  // 9. Acao ver mostra lista
  const interAcaoVer = { ...interSelect, isStringSelectMenu: () => true, customId: "autoresp:acao", values: ["ver"], update: async (payload) => { ultimoUpdate = payload; } };
  await client.emit("interactionCreate", interAcaoVer);
  const mostrouLista = String(ultimoUpdate.content || "").includes("estoque");
  console.log(mostrouLista ? "OK acao ver mostra lista" : "FALHA ver: " + JSON.stringify(ultimoUpdate));
  if (!mostrouLista) process.exit(1);

  // 10. Acao limpar mostra botoes de confirmacao
  const interAcaoLimpar = { ...interSelect, isStringSelectMenu: () => true, customId: "autoresp:acao", values: ["limpar"], update: async (payload) => { ultimoUpdate = payload; } };
  await client.emit("interactionCreate", interAcaoLimpar);
  const temBotoesLimpar = ultimoUpdate?.components?.[0]?.components?.length === 2
    && ultimoUpdate.components[0].components[0].data.custom_id === "autoresp:limparsim"
    && ultimoUpdate.components[0].components[1].data.custom_id === "autoresp:limparnao";
  console.log(temBotoesLimpar ? "OK acao limpar mostra confirmacao" : "FALHA limpar: " + JSON.stringify(ultimoUpdate));
  if (!temBotoesLimpar) process.exit(1);

  // 11. Confirmar limpar apaga tudo
  const interLimparSim = { ...interSelect, isStringSelectMenu: () => false, isButton: () => true, customId: "autoresp:limparsim", values: undefined, update: async (payload) => { ultimoUpdate = payload; } };
  await client.emit("interactionCreate", interLimparSim);
  const limpou = store2.listar(g).length === 0;
  console.log(limpou ? "OK limpar apaga tudo" : "FALHA limpar sim: " + JSON.stringify(store2.listar(g)));
  if (!limpou) process.exit(1);
  try { fs.rmSync(arq); } catch (e) {}
  const slashCmd = require("../src/commands/autoresposta");
  const dataSlash = slashCmd.data.toJSON();
  const subsSlash = (dataSlash.options || []).filter((o) => o.type === 1);
  let ultimoSlash = null;
  const interSlash = { guild, guildId: g, member, user: { id: uid }, isChatInputCommand: () => true, options: { getSubcommand: () => null, getString: () => null }, reply: async (payload) => { ultimoSlash = payload; }, showModal: async (m) => { ultimoSlash = m; } };
  await slashCmd.execute(interSlash);
  const slOk = dataSlash.name === "autoresposta" && subsSlash.length === 0 && JSON.stringify(ultimoSlash).includes("autoresp:acao");
  console.log(slOk ? "OK slash unico abre painel central" : "FALHA slash unico: " + JSON.stringify(dataSlash.options));
  if (!slOk) process.exit(1);
  const interOpts = { guild,guildId:g,member,user:{ id:uid },isChatInputCommand: () => true, isButton: () => false, isAnySelectMenu: () => false, isStringSelectMenu: () => false, isModalSubmit: () => false, isCommand: () => false, isChannelSelectMenu: () => false, options:{ getSubcommand: () => null, getString: (k) => ({ palavra:"estoque", resposta:"veja #vendas", canais:"231,432" }[k] || "" ) }, reply: async () => {}, showModal: async (m) => { ultimoSlash = m; } };
  await slashCmd.execute(interOpts);
  const jm = ultimoSlash.toJSON();
  const optsOk = jm.custom_id === "autoresp:addmodal:canais" && jm.components[0].components[0].value === "estoque" && jm.components[1].components[0].value === "veja #vendas" && jm.components[2].components[0].value === "231,432";
  console.log(optsOk ? "OK slash com opcoes pre-preenche o modal" : "FALHA pre: " + JSON.stringify(jm));
  if (!optsOk) process.exit(1);
  const interModal = { guild,guildId:g,member,user:{ id:uid },isModalSubmit: () => true, isButton: () => false, isAnySelectMenu: () => false, isStringSelectMenu: () => false, isCommand: () => false, isChannelSelectMenu: () => false, customId:"autoresp:addmodal:canais",fields:{ getTextInputValue: (k) => ({ palavra:"estoque", resposta:"veja #vendas", canais:"231,432" }[k] || "" ) },reply: async () => {} };
  await client.emit("interactionCreate", interModal);
  const salvou = JSON.stringify(store2.listar(g)).includes("estoque") && JSON.stringify(store2.listar(g)).includes("231");
  console.log(salvou ? "OK modal pre-preenchido salva com canais" : "FALHA submit pre: " + JSON.stringify(store2.listar(g)));
  if (!salvou) process.exit(1);

  // 18. Editar abre select com botao voltar, e voltar retorna ao painel
  let ultimoUpd2 = null;
  const interEditVoltar = { ...interSelect, isStringSelectMenu: () => true, customId: "autoresp:acao", values: ["editar"], update: async (payload) => { ultimoUpd2 = payload; } };
  await client.emit("interactionCreate", interEditVoltar);
  const temVoltarNaEdicao = ultimoUpd2?.components?.[1]?.components?.[0]?.data?.custom_id === "autoresp:voltar";
  console.log(temVoltarNaEdicao ? "OK editar mostra botao voltar" : "FALHA voltar edicao: " + JSON.stringify(ultimoUpd2));
  if (!temVoltarNaEdicao) process.exit(1);
  const interVoltar = { ...interSelect, isStringSelectMenu: () => false, isButton: () => true, customId: "autoresp:voltar", values: undefined, update: async (payload) => { ultimoUpd2 = payload; } };
 await client.emit("interactionCreate", interVoltar);
  const voltouAoMenu = String(ultimoUpd2?.content || "").includes("Painel de auto-respostas") && JSON.stringify(ultimoUpd2).includes("autoresp:acao");
  console.log(voltouAoMenu ? "OK voltar retorna ao menu principal" : "FALHA voltar menu: " + JSON.stringify(ultimoUpd2));
 if (!voltouAoMenu) process.exit(1);


  // 19. Criar sem canais no modal mostra seletor de canais da guild
  let ultimaTela = null;
  const interAddSemCanal = { ...interSelect, isStringSelectMenu: () => false, isModalSubmit: () => true, customId: "autoresp:addmodal:canais", fields: { getTextInputValue: (c) => (c === "palavra" ? "novoitem" : c === "resposta" ? "resposta nova" : "") }, reply: async (payload) => { ultimaTela = payload; } };
 await client.emit("interactionCreate", interAddSemCanal);
  const respTela = ultimaTela && (ultimaTela.toJSON ? ultimaTela.toJSON() : ultimaTela);
  const tela = JSON.stringify(respTela);
  const temSelectCanais = respTela?.components?.[0]?.components?.[0]?.data?.custom_id === "autoresp:pickcanais"
    && respTela?.components?.[1]?.components?.[0]?.data?.custom_id === "autoresp:picksalvar";
  console.log(temSelectCanais ? "OK criar sem canais mostra seletor de canais" : "FALHA tela canais: " + tela);
 if (!temSelectCanais) process.exit(1);

  // 20. Escolher 2 canais no ChannelSelect salva com ambos
  let capturouUpdate = null;
  const interPickCanais = { ...interSelect, isStringSelectMenu: () => false, isChannelSelectMenu: () => true, customId: "autoresp:pickcanais", values: ["111", "222"], update: async (payload) => { capturouUpdate = payload;; } };
 await client.emit("interactionCreate", interPickCanais);
  const salvouCanaisPick = store2.listar(g).some((r) => r.palavra === "novoitem" && Array.isArray(r.canais) && r.canais.includes("111") && r.canais.includes("222"));
  console.log(salvouCanaisPick ? "OK seletor salva com multiplos canais" : "FALHA pick canais: " + JSON.stringify(store2.listar(g)));
 if (!salvouCanaisPick) process.exit(1);


  console.log("TESTE-CANAL-OK");
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
