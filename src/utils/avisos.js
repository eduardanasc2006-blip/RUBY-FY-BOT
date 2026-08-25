const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', '..', 'data', 'canal_avisos.json');

function carregar() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return null; }
}

function definir(canalId) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify({ canalId }, null, 2));
}

// Envia um aviso para o canal configurado (se houver)
async function avisar(client, texto) {
  const ref = carregar();
  if (!ref) return false;
  try {
    const canal = await client.channels.fetch(ref.canalId);
    await canal.send(texto);
    return true;
  } catch {
    return false;
  }
}

module.exports = { definir, avisar, carregar };
