const fs = require('node:fs');
const path = require('node:path');
const { buildPanel } = require('./panel');

const PANEL_FILE = path.join(__dirname, '..', '..', 'data', 'panel.json');

function loadPanelRef() {
  try {
    return JSON.parse(fs.readFileSync(PANEL_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function savePanelRef(ref) {
  fs.mkdirSync(path.dirname(PANEL_FILE), { recursive: true });
  fs.writeFileSync(PANEL_FILE, JSON.stringify(ref, null, 2));
}

// Edita o painel existente se ainda existir; senão publica um novo no canal
async function publishOrUpdatePanel(channel) {
  const payload = buildPanel();
  const ref = loadPanelRef();

  if (ref) {
    try {
      const painelChannel = await channel.client.channels.fetch(ref.channelId);
      const mensagem = await painelChannel.messages.fetch(ref.messageId);
      await mensagem.edit(payload);
      return { atualizado: true, mensagem };
    } catch {
      // Referência inválida (mensagem apagada ou canal inacessível): limpa e publica novo.
      limparRef();
    }
  }

  const mensagem = await channel.send(payload);
  savePanelRef({ channelId: mensagem.channelId, messageId: mensagem.id });
  return { atualizado: false, mensagem };
}

function limparRef() {
  try {
    fs.rmSync(PANEL_FILE);
  } catch {}
}

// Re-renderiza o painel salvo (usado pelo !settaxa para refletir a nova taxa)
async function refreshSavedPanel(client) {
  const ref = loadPanelRef();
  if (!ref) return false;
  try {
    const painelChannel = await client.channels.fetch(ref.channelId);
    const mensagem = await painelChannel.messages.fetch(ref.messageId);
    await mensagem.edit(buildPanel());
    return true;
  } catch {
    return false;
  }
}

module.exports = { publishOrUpdatePanel, refreshSavedPanel };
