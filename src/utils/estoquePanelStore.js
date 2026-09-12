const fs = require('node:fs');
const path = require('node:path');
const { publicoCategorias } = require('./estoquePanel');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'painel_estoque');

function arquivoRef(guildId) {
  return path.join(DATA_DIR, `${guildId}.json`);
}

function carregar(guildId) {
  try {
    return JSON.parse(fs.readFileSync(arquivoRef(guildId), 'utf8') );
  } catch {
    return null;
  }
}

function salvar(guildId, ref) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(arquivoRef(guildId), JSON.stringify(ref, null, 2));
}

// Publica o painel fixo ou edita o existente. forcarNovo=true sempre publica novo.
async function publicarOuAtualizar(channel, forcarNovo = false) {
  const guildId = channel.guildId;
  const payload = publicoCategorias(guildId);
  const ref = forcarNovo ? null : carregar(guildId);

  if (ref) {
    try {
      const ch = await channel.client.channels.fetch(ref.channelId);
      const msg = await ch.messages.fetch(ref.messageId);
      await msg.edit(payload);
      return { atualizado: true, mensagem: msg };
    } catch {
      // Referência inválida: limpa e publica novo abaixo.


      limparRef(guildId);
    }
  }

  const msg = await channel.send(payload);
  salvar(guildId, { channelId: msg.channelId, messageId: msg.id });
  return { atualizado: false, mensagem: msg };
}

function limparRef(guildId) {
  try {
    fs.rmSync(arquivoRef(guildId));
  } catch {}
}

// Re-renderiza os painéis fixos de TODAS as guilds (cada uma com seu estoque)
async function refreshPainelEstoque(client) {
  if (!fs.existsSync(DATA_DIR) ) return false;
  const arquivos = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
  let algum = false;
  for (const f of arquivos) {
    const guildId = path.basename(f, '.json');
    const ref = carregar(guildId);
    if (!ref) continue;
    try {
      const ch = await client.channels.fetch(ref.channelId);
      const msg = await ch.messages.fetch(ref.messageId);
      await msg.edit(publicoCategorias(guildId));
      algum = true;
    } catch {
      limparRef(guildId);
    }
  }
  return algum;
}