const fs = require('node:fs');
const path = require('node:path');
const { publicoCategorias } = require('./estoquePanel');

const FILE = path.join(__dirname, '..', '..', 'data', 'painel_estoque.json');

function carregar() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return null;
  }
}

function salvar(ref) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(ref, null, 2));
}

// Publica o painel fixo ou edita o existente. forcarNovo=true sempre publica novo.
async function publicarOuAtualizar(channel, forcarNovo = false) {
  const payload = publicoCategorias();
  const ref = forcarNovo ? null : carregar();

  if (ref) {
    try {
      const ch = await channel.client.channels.fetch(ref.channelId);
      const msg = await ch.messages.fetch(ref.messageId);
      await msg.edit(payload);
      return { atualizado: true, mensagem: msg };
    } catch {
      // Referência inválida: limpa e publica novo abaixo.
      limparRef();
    }
  }

  const msg = await channel.send(payload);
  salvar({ channelId: msg.channelId, messageId: msg.id });
  return { atualizado: false, mensagem: msg };
}

function limparRef() {
  try {
    fs.rmSync(FILE);
  } catch {}
}

// Re-renderiza o painel fixo (chamado apos qualquer mudanca no estoque)
async function refreshPainelEstoque(client) {
  const ref = carregar();
  if (!ref) return false;
  try {
    const ch = await client.channels.fetch(ref.channelId);
    const msg = await ch.messages.fetch(ref.messageId);
    await msg.edit(publicoCategorias());
    return true;
  } catch {
    return false;
  }
}

module.exports = { publicarOuAtualizar, refreshPainelEstoque };
