process.env.DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN || "fake-token";
process.env.ADMIN_IDS = "111111111111111111";
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("discord.js");

const guildId = "111111111111111111";
const arqEst = path.join(__dirname, "..", "data", "estoque", guildId + ".json");
const arqRef = path.join(__dirname, "..", "data", "painel_categoria.json");
try { fs.rmSync(arqEst); } catch (e) {}
try { fs.rmSync(arqRef); } catch (e) {}

const member = { id: guildId, permissions: { has: () => true }, roles: { cache: new Map() }, guild: { id: guildId } };
const canalAtual = { id: "333", name: "atual", guildId, isTextBased: () => true, isVoiceBased: () => false, isThread: () => false, position: 0, parent: null, permissionsFor: () => ({ has: () => true }), send: async () => ({ id: "mA", channelId: "333" }), client: {} };
const canalAlvo = { id: "444", name: "vendas", guildId, isTextBased: () => true, isVoiceBased: () => false, isThread: () => false, position: 1, parent: { name: "TEXTO" }, permissionsFor: () => ({ has: () => true }), client: {} };
canalAlvo.send = async (payload) => { canalAlvo.enviou = true; canalAlvo.payload = payload; return { id: "mB", channelId: "444" }; };

const colecaoCanais = {
  get: (id) => (id === canalAtual.id ? canalAtual : id === canalAlvo.id ? canalAlvo : null),
  filter: () => colecaoCanais,
  sort: () => colecaoCanais,
  first: () => [canalAtual, canalAlvo],
  size: 2,
};
const guild = { id: guildId, name: "Teste", members: { me: member }, channels: { cache: colecaoCanais } };
canalAtual.guild = guild;
canalAlvo.guild = guild;

let capturado = null;
const loginOriginal = Client.prototype.login;
Client.prototype.login = async function () { capturado = this; return "local"; };
require("../src/index.js");
Client.prototype.login = loginOriginal;
const client = capturado;
if (!client) throw new Error("nao capturou o client");

// O handler do index e async; client.emit() nao espera a promise terminar.
// Aguarda alguns ticks para o handler completar (publicacao no canal, escrita em arquivo).
const esperar = () => new Promise((r) => setTimeout(r, 60));

function base(extra) {
  return {
    isButton: () => false,
    isModalSubmit: () => false,
    isStringSelectMenu: () => false,
    isChannelSelectMenu: () => false,
    isAnySelectMenu: () => false,
    isRoleSelectMenu: () => false,
    isUserSelectMenu: () => false,
    isMentionableSelectMenu: () => false,
    isChatInputCommand: () => false,
    isContextMenuCommand: () => false,
    guildId, guild, member, user: { id: guildId },
    channel: canalAtual,
    champion: null,
    reply: async (p) => { base.ultimoReply = p; return p; },
    update: async (p) => { base.ultimaAtualizacao = p; return p; },
    deferUpdate: async () => { base.deferredChamou = true; return null; },
    deferred: false,
    replied: false,
    ...extra,
  };
}
const btnCategoria = base({ isButton: () => true, customId: "painelcat:vip", values: undefined });
const btnCategoriaSemCh = (() => { const i = base({ isButton: () => true, customId: "painelcat:vip", values: undefined }); delete i.channel; i.guildId = guildId; return i; })();

(async () => {
  const estoque = require("../src/utils/estoque");
  estoque.addCategoria(guildId, "vip");
  estoque.addProduto(guildId, "vip", { nome: "KVM", valor: 100, controlarQtd: true, quantidade: 5 });

  // 1. Clicar no botao da categoria abre o seletor de canal (nao publica ainda)
  await client.emit("interactionCreate", btnCategoria);
  await esperar();
  const aberto = base.ultimaAtualizacao;
  const sel = aberto?.components?.[0]?.components?.[0];
  const temSelect = !!sel && sel.data?.custom_id === "painelcat:vip:canal";
  const temBtns = aberto?.components?.[1]?.components?.some((c) => c.data.custom_id === "painelcat:vip:canal:atual")
    && aberto?.components?.[1]?.components?.some((c) => c.data.custom_id === "painelcat:vip:canal:cancelar");
  const naoPublicouAinda = !canalAtual.enviou && !canalAlvo.enviou;
  console.log((temSelect && temBtns && naoPublicouAinda) ? "OK botao abre seletor de canal" : "FALHA abrir seletor: select=" + temSelect + " btns=" + temBtns + " publicou=" + !naoPublicouAinda);
  if (!(temSelect && temBtns && naoPublicouAinda)) process.exit(1);

  // 2. Escolher canal no select publica la (e salva referencia)
  const interSelect = base({ isStringSelectMenu: () => true, customId: "painelcat:vip:canal", values: ["444"] });
  await client.emit("interactionCreate", interSelect);
  await esperar();
  const publicouNoAlvo = canalAlvo.enviou === true;
  const payloadAlvo = canalAlvo.payload;
  const embedsAlvo = payloadAlvo?.embeds?.length === 1;
  const ref = fs.existsSync(arqRef) ? JSON.parse(fs.readFileSync(arqRef, "utf8")) : {};
  const refSalva = Object.values(ref).some((r) => r.catId === "vip" && r.channelId === "444" && r.guildId === guildId);
  console.log((publicouNoAlvo && embedsAlvo && refSalva) ? "OK select publica no canal escolhido" : "FALHA publicar alvo: publicou=" + publicouNoAlvo + " embeds=" + embedsAlvo + " ref=" + refSalva);
  if (!(publicouNoAlvo && embedsAlvo && refSalva)) process.exit(1);

  // 3. Cancelar volta ao seletor de categorias
  base.ultimaAtualizacao = null;
  base.ultimoReply = null;
  const interCancelar = base({ isButton: () => true, customId: "painelcat:vip:canal:cancelar" });
  await client.emit("interactionCreate", interCancelar);
  await esperar();
  const voltou = !!base.ultimaAtualizacao && (base.ultimaAtualizacao.embeds?.[0]?.data?.title || '').includes('Fixar painel de categoria');
  console.log(voltou ? "OK cancelar volta ao seletor" : "FALHA cancelar: " + JSON.stringify(base.ultimaAtualizacao?.embeds?.[0]?.data?.title));
  if (!voltou) process.exit(1);

  // 4. Usuario sem permissao e bloqueado no picker
  const memberComum = { id: "999", permissions: { has: () => false }, roles: { cache: new Map() }, guild: { id: guildId } };
  const interComum = base({ isButton: () => true, isStringSelectMenu: () => false, customId: "painelcat:vip", member: memberComum, user: { id: "999" } });
  await client.emit("interactionCreate", interComum);
  await esperar();
  const bloqueado = (base.ultimoReply?.content || '').includes('Somente administradores');
  console.log(bloqueado ? "OK membro comum bloqueado" : "FALHA bloqueio: " + JSON.stringify(base.ultimoReply));
  if (!bloqueado) process.exit(1);

  console.log("PAINELCATEGORIA-FLUXO-OK");
  try { fs.rmSync(arqEst); } catch (e) {}
  try { fs.rmSync(arqRef); } catch (e) {}
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });