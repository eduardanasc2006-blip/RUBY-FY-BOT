// Painel central de auto-respostas: nao deve quebrar sem canais de texto validos.
process.env.ADMIN_IDS = "111111111111111111";
const path = require("node:path");
const fs = require("node:fs");
const { Collection } = require("discord.js");
const store = require("../src/utils/autoRespostaStore");
const { painelCentral } = require("../src/utils/autoRespostaPanel");
const g = "555555555555555555";
const arq = path.join(__dirname, "..", "data", "autorespostas", g + ".json");
try { fs.rmSync(arq); } catch (e) {}
store.adicionar(g, "estoque", "veja #vendas", []);
store.adicionar(g, "oi", "ola!", []);

const guildSemCanais = {
  channels: { cache: new Collection() },
  members: { me: { id: "1509146932478476389" } },
};

const canal = {
  id: "111",
  name: "geral",
  position: 0,
  parent: null,
  isTextBased: () => true,
  isThread: () => false,
  isVoiceBased: () => false,
  permissionsFor: () => ({ has: () => true }),
};
const cacheComCanais = new Collection();
cacheComCanais.set("111", canal);
const guildComCanais = {
  channels: { cache: cacheComCanais },
  members: { me: { id: "1509146932478476389" } },
};

let falhas = 0;
function checa(nome, cond) {
  if (!cond) {
    console.error("❌", nome);
    falhas++;
  } else {
    console.log("✅", nome);
  }
}

try {
  const semCanaais = painelCentral(g, guildSemCanais);
  const semNull = semCanaais.components.every((c) => c !== null && c !== undefined);
 checa(
    "painel sem canais validos nao inclui null nos components",
    semCanaais.components.length === 1 && semNull
  );
 checa(
    "painel sem canais validos ainda mostra o select de acoes",
    semCanaais.components?.[0]?.components?.[0]?.data?.custom_id === "autoresp:acao"
  );

 const comCanaais = painelCentral(g, guildComCanais);
 const comNull = comCanaais.components.every((c) => c !== null && c !== undefined);
  checa(
    "painel com canais validos tem 3 linhas (acao + rapido + botoes)",
    comCanaais.components.length === 3 && comNull
  );
} catch (e) {
  console.error("❌ excecao inesperada:", e.message);
  falhas++;
}

try { fs.rmSync(arq); } catch (e) {}
if (falhas) {
  console.error("PAINEL-AUTORESPOSTA-FALHOU:", falhas);
  process.exit(1);
}
console.log("PAINEL-AUTORESPOSTA-OK");