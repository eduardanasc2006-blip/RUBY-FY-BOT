const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder } = require('discord.js');

const FILE = path.join(__dirname, '..', '..', 'data', 'log_compras.json');

let dados = {};
try {
  dados = JSON.parse(fs.readFileSync(FILE, 'utf8'));
} catch {
  dados = {};
}

function salvar() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(dados, null, 2));
}

// Canal de logs de compras de um servidor (null = desativado/nao configurado).
function obter(guildId) {
  if (!guildId) return null;
  const ref = dados[guildId];
  if (!ref) return null;
  return ref.canalId || null;
}

function definir(guildId, canalId) {
  if (!guildId) return;
  dados[guildId] = { canalId };
  salvar();
}

function desativar(guildId) {
  if (!guildId) return;
  dados[guildId] = { canalId: null };
  salvar();
}

// Envia um embed de log para o canal configurado (se houver).
// Estrutura: titulo, descricao e campos montados pelo chamador.

async function enviar(client, guildId, { titulo = '🧾 Log de compras', descricao = null, cor = 0xbeb6ff, campos = [], timestamp = false }) {
  const canalId = obter(guildId);
  if (!canalId || !client) return false;
  try {
    const canal = await client.channels.fetch(canalId);
    if (!canal || !canal.isTextBased()) return false;
    const embed = new EmbedBuilder()
      .setColor(cor)
      .setTitle(titulo);
    if (descricao) embed.setDescription(descricao);
    if (timestamp) embed.setTimestamp(Date.now());
    if (campos.length) {
      for (const c of campos.slice(0, 8)) {
        embed.addFields({ name: c.name, value: c.value, inline: !!c.inline });
      }
    }
    await canal.send({ embeds: [embed], allowedMentions: { parse: [] } });
    return true;
  } catch (e) {
    console.error('[LogCompras] Falha ao enviar log:', e?.message || e);
    return false;
  }
}

module.exports = { obter, definir, desativar, enviar };