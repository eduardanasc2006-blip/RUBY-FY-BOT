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

// Monta as embeds de log a partir de titulo/descricao/campos ou grupos.
// - `campos`: (antigo) todos os campos sao colocados na embed principal.
// - `grupos`: lista de grupos — o 1º grupo vai na embed principal (junto com
//   titulo/descricao) e cada grupo seguinte vira uma embed separada, para
//   a mensagem nao virar um bloco unico gigante.
function montarEmbeds({ titulo = '🧾 Log de compras', descricao = null, cor = 0xbeb6ff, campos = [], grupos = [], timestamp = false }) {
  const corFinal = cor ?? 0xbeb6ff;
  const lista = grupos.length ? grupos : [campos];
  const embeds = [];
  lista.slice(0, 10).forEach((g, i) => {
    const builder = i === 0
      ? new EmbedBuilder().setColor(corFinal).setTitle(titulo)
      : new EmbedBuilder().setColor(corFinal);
    if (i === 0 && descricao) builder.setDescription(descricao);
    if (i === 0 && timestamp) builder.setTimestamp(Date.now());
    if (g && g.length) {
      for (const c of g.slice(0, 8)) {
        builder.addFields({ name: c.name, value: c.value, inline: !!c.inline });
      }
    }
    embeds.push(builder);
  });
  return embeds;
}

// Envia o log para o canal configurado (se houver).
// Estrutura: titulo, descricao, cor, timestamp e campos/grupos do chamador.

async function enviar(client, guildId, opts = {}) {
  const canalId = obter(guildId);
  if (!canalId || !client) return false;
  try {
    const canal = await client.channels.fetch(canalId);
    if (!canal || !canal.isTextBased()) return false;
    const embeds = montarEmbeds(opts);
    await canal.send({ embeds, allowedMentions: { parse: [] } });
    return true;
  } catch (e) {
    console.error('[LogCompras] Falha ao enviar log:', e?.message || e);
    return false;
  }
}

module.exports = { obter, definir, desativar, enviar, montarEmbeds };