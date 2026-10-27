const { EmbedBuilder } = require('discord.js');
const comprasStore = require('./comprasStore');
const metasStore = require('./metasStore');
const { metasConquistadas, concederCargosDasMetas } = require('./metasVenda');
const { formatBRL } = require('./robuxConverter');

const COR = 0xbeb6ff;

// Aceita "10", "10,50", "R$ 10,50", "1.234,56" e devolve número em reais.
// Retorna null quando não dá para interpretar.
function parseValor(bruto) {
  if (bruto == null) return null;
  const texto = String(bruto).trim().replace(/r\$/i, '').replace(/\s/g, '');
  if (!texto) return null;
  // Formato pt-BR: ponto separa milhar, vírgula separa centavos.
  const normalizado = texto.includes(',')
    ? texto.replace(/\./g, '').replace(',', '.')
    : texto;
  const n = Number(normalizado);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

// Aceita "2", "2 vendas" e devolve inteiro >= 1.
function parseQuantidade(bruto) {
  if (bruto == null || bruto === '') return 1;
  const n = parseInt(String(bruto).replace(/\D/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

// Lança a venda: credita no cliente, avalia as metas e concede os cargos.
// Devolve o que foi lançado + as metas conquistadas, para o comando montar o resumo.
async function lancarVenda(client, guild, { clienteId, clienteTag = null, valor, quantidade = 1, descricao = '', registradoPor = null }) {
  const guildId = guild.id;
  const conquistadas = metasConquistadas(guildId, clienteId, valor, quantidade);

  const lancamento = comprasStore.registrarVendaManual(guildId, clienteId, valor, {
    descricao,
    registradoPor,
    clienteTag,
    quantidade,
    cargosNovos: conquistadas.map((m) => m.cargoNome || `<@&${m.cargoId}>`),
  });

  await concederCargosDasMetas(client, guild, guildId, clienteId, conquistadas, clienteTag);

  const acumulado = comprasStore.dadosDoCliente(guildId, clienteId);
  return { lancamento, conquistadas, acumulado };
}

// Resumo de tudo que o cliente já gastou (compras do /comprar + lançamentos manuais).
function resumoCliente(guildId, clienteId) {
  const acumulado = comprasStore.dadosDoCliente(guildId, clienteId);
  const manuais = comprasStore.listarLancamentos(guildId, clienteId);
  const totalManual = manuais.reduce((s, l) => s + (l.valor || 0), 0);
  const cargos = comprasStore.cargosDoCliente(guildId, clienteId) || [];
  const metas = metasStore.listaMetas(guildId);

  return {
    acumulado,
    manuais,
    totalManual,
    cargos,
    metas,
    faltando: metasAtingiveis(acumulado, cargos, metas),
  };
}

// Para cada meta ainda não conquistada, quanto falta (em R$ ou em vendas).
function metasAtingiveis(acumulado, cargos, metas) {
  const gasto = acumulado.gasto || 0;
  const vendas = acumulado.vendas || 0;
  const pendentes = [];
  for (const m of metas) {
    if (!m || !m.cargoId) continue;
    const ref = m.cargoNome || `<@&${m.cargoId}>`;
    if (cargos.includes(ref)) continue;
    const alvo = m.meta || 0;
    if (m.tipo === 'valor') {
      pendentes.push({ meta: m, restante: Math.max(0, alvo - gasto), unidade: 'valor' });
    } else {
      pendentes.push({ meta: m, restante: Math.max(0, alvo - vendas), unidade: 'vendas' });
    }
  }
  return pendentes;
}

function embedLancamento(lancamento, conquistadas, acumulado, clienteTag) {
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('💸 Venda lançada')
    .setDescription(
      `👤 Cliente: ${clienteTag || `<@${lancamento.clienteId}>`} (\`${lancamento.clienteId}\`)\n` +
      `💰 Valor: **${formatBRL(lancamento.valor)}**\n` +
      `🛍️ Vendas nesta venda: **${lancamento.quantidade}**` +
      (lancamento.descricao ? `\n📝 ${lancamento.descricao}` : '')
    )
    .addFields(
      { name: '📊 Total gasto', value: formatBRL(acumulado.gasto || 0), inline: true },
      { name: '🧾 Total de vendas', value: `${acumulado.vendas || 0}`, inline: true }
    )
    .setFooter({ text: `Lançamento #${lancamento.id}` });

  if (conquistadas.length) {
    embed.addFields({
      name: '🏆 Metas conquistadas',
      value: conquistadas.map((m) => `• **${m.cargoNome || `<@&${m.cargoId}>`}**`).join('\n'),
    });
  }
  return embed;
}

function embedResumoCliente(clienteId, resumo) {
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('📊 GASTO DO CLIENTE')
    .setDescription(`👤 Cliente: <@${clienteId}>`)
    .addFields(
      { name: '💰 Total gasto', value: formatBRL(resumo.acumulado.gasto || 0), inline: true },
      { name: '🛍️ Vendas', value: `${resumo.acumulado.vendas || 0}`, inline: true },
      { name: '🧾 Lançado manualmente', value: formatBRL(resumo.totalManual), inline: true },
      {
        name: '🏆 Cargos conquistados',
        value: resumo.cargos.length ? resumo.cargos.map((c) => `• ${c}`).join('\n') : '*Nenhum ainda.*',
      }
    );

  if (resumo.faltando.length) {
    embed.addFields({
      name: '🎯 Faltando para as próximas metas',
      value: resumo.faltando
        .map((f) => {
          const ref = f.meta.cargoNome || `<@&${f.meta.cargoId}>`;
          const falta = f.unidade === 'valor' ? formatBRL(f.restante) : `${f.restante} venda(s)`;
          return `• **${ref}** — falta ${falta}`;
        })
        .join('\n'),
    });
  }
  return embed;
}

module.exports = { parseValor, parseQuantidade, lancarVenda, resumoCliente, embedLancamento, embedResumoCliente };
