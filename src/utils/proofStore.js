const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder } = require('discord.js');

// Canal de "proofs"/comprovantes por guild, + envio do comprovante.
// Arquivo: data/proofs.json  Estrutura: { [guildId]: { canalId } }

const FILE = path.join(__dirname, '..', '..', 'data', 'proofs.json');

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

function obter(guildId) {
  if (!guildId) return null;
  const ref = dados[guildId];
  return ref ? ref.canalId : null;
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

// Envia uma solicitação de comprovante (proof) no canal configurado.
// Embed enxuta com produto/valor e instrução para o cliente usar /proof.
async function enviarSolicitacao(client, guildId, pedido) {
  const canalId = obter(guildId);
  if (!canalId || !client || !pedido) return false;
  try {
    const canal = await client.channels.fetch(canalId);
    if (!canal || !canal.isTextBased()) return false;
    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('🧾 Comprovante solicitado')
      .setDescription(`**Pedido #${pedido.id}** confirmado — peça para o cliente enviar o comprovante:\n\n\`/proof imagem:<foto>\` (print/foto da entrega)\nou \`/proof link:<url>\``)
      .addFields(
        { name: '👤 Cliente', value: `${pedido.clienteTag || `<@${pedido.clienteId}>`} (\`${pedido.clienteId}\`)`, inline: true },
        { name: '📦 Item', value: pedido.itemNome, inline: true },
        { name: '💰 Valor', value: `R$ ${pedido.valor.toFixed(2).replace('.', ',')}`, inline: true }
      );
    await canal.send({ embeds: [embed], allowedMentions: { parse: [] } });
    return true;
  } catch (e) {
    console.error('[Proof] Falha ao enviar solicitação:', e?.message || e);
    return false;
  }
}

// Publica o comprovante enviado pelo cliente no canal de proofs (para a equipe).
// - ehImagem=true: mostra a imagem inline na embed (upload direto pelo cliente)
// - link: mostra link clicável
async function publicarProof(client, guildId, autor, pedido, url, ehImagem) {
  const canalId = obter(guildId);
  if (!canalId || !client || !pedido) return false;
  try {
    const canal = await client.channels.fetch(canalId);
    if (!canal || !canal.isTextBased()) return false;
    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('📎 Comprovante recebido')
      .setDescription(ehImagem ? '*Imagem do comprovante:*' : (url ? `[Abrir comprovante](${url})` : '*Comprovante enviado.*'));
    if (ehImagem && url) {
      embed.setImage(url);
    }
    embed.addFields(
      { name: '🧾 Pedido', value: `#${pedido.id}`, inline: true },
      { name: '👤 Cliente', value: autor ? `<@${autor.id}>` : `<@${pedido.clienteId}>`, inline: true },
      { name: '📦 Item', value: pedido.itemNome, inline: true },
      { name: '💰 Valor', value: `R$ ${pedido.valor.toFixed(2).replace('.', ',')}`, inline: true }
    );
    await canal.send({ embeds: [embed], allowedMentions: { parse: [] } });
    return true;
  } catch (e) {
    console.error('[Proof] Falha ao publicar proof:', e?.message || e);
    return false;
  }
}

module.exports = { obter, definir, desativar, enviarSolicitacao, publicarProof };