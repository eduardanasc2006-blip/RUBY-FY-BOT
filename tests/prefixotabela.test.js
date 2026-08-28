const path = require("node:path");
const proj = __dirname + "/..";
const canalA = { id: "111", name: "geral", isTextBased: () => true, permissionsFor: () => ({ has: () => true }) };
const canalB = { id: "222", name: "vendas", isTextBased: () => true, permissionsFor: () => ({ has: () => true }) };
let captured = null;
canalA.send = async () => ({ id: "mA" });
canalB.send = async () => { canalB.enviado = true; return { id: "mB" }; };
const member = { permissions: { has: () => true }, roles: { cache: new Map() } };
const guild = { id: "g1", name: "Teste", members: { me: member } };
const uid = "u" + "ser";
const message = {
  guild,
  member,
  author: { id: uid },
  content: "",
  mentions: { channels: { first: () => canalB }, roles: { first: () => null }, users: { first: () => null } },
  channel: canalA,
  reply: async (p) => { captured = p; return p; },
  delete: () => Promise.resolve(),
};
process.env.ADMIN_IDS = uid;
const tabela = require(path.join(proj, "src/prefixCommands/tabela"));

(async () => {
  await tabela.execute(message, ["nova"]);
  console.log(String(canalB.enviado === true ? "SIM" : "NAO") + " -> enviou no canalB (#vendas)?");
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
