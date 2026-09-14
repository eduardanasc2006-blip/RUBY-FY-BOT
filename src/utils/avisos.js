const fs = require('node:fs');
const path = require('node:path');

// Canal de avisos por guild. Arquivo: data/canal_avisos.json
// Estrutura: { [guildId]: canalId }
const FILE = path.join(__dirname, '..', '..', 'data', 'canal_avisos.json');

// Formato legado (global) tinha { canalId: '...' } sem guild — NÃO é usado,
// para não vazar o canal de um servidor para outro. O admin redefine em cada guilda.
let dados = {};
try {
  dados = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  if (dados && !Array.isArray(dados) && typeof dados === 'object' && dados.canalId && !dados.guildId) {
    // Config antiga global: ignora (não pertence a nenhuma guilda conhecida).
  }
} catch {
  dados = {};
}

function salvar() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(dados, null, 2));
}

function carregar(guildId) {
  if (!guildId) return null;
  return dados[guildId] || null;
}

function definir(guildId, canalId) {
  if (!guildId) return;
  dados[guildId] = canalId;
  salvar();
}

// Envia um aviso para o canal configurado (se houver)
async function avisar(client, guildId, texto) {
  const canalId = carregar(guildId);
  if (!canalId) return false;
  try {
    const canal = await client.channels.fetch(canalId);
    await canal.send(texto);
    return true;
  } catch {
    return false;
  }
}

module.exports = { definir, avisar, carregar };
