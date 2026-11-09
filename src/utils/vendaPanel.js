const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const comprasStore = require('./comprasStore');
const metasStore = require('./metasStore');
const { metasConquistadas, concederCargosDasMetas } = require('./metasVenda');
const { formatBRL } = require('./robuxConverter');

const COR = 0xbeb6ff;
// Lancamentos mostrados por pagina na lista de remocao (o Discord limita a 5
// botoes por linha / 5 linhas por mensagem). Cabe 1 select (25 opcoes) + botoes.
const LANCAMENTOS_POR_PAGINA = 20;

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

// ----- Remoção de lançamentos manuais -----
// Permite desfazer um lançamento que entrou a mais (valor digitado errado, venda
// duplicada...). O valor/vendas sai do gasto do cliente; cargos já concedidos
// NÃO são removidos (comportamento de comprasStore.removerLancamento).

function dataLancamento(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return new Date(ts).toLocaleString('pt-BR');
  }
}

// Lista (paginada) os lançamentos manuais de um cliente, com um select para
// escolher qual remover. Sem lançamentos, mostra aviso.
function painelRemoverLancamento(guildId, clienteId, pagina = 0) {
  const lancamentos = comprasStore.listarLancamentos(guildId, clienteId);
  const totalPaginas = Math.max(1, Math.ceil(lancamentos.length / LANCAMENTOS_POR_PAGINA));
  const paginaAtual = Math.min(Math.max(Number(pagina) || 0, 0), totalPaginas - 1);
  const visiveis = lancamentos.slice(paginaAtual * LANCAMENTOS_POR_PAGINA, (paginaAtual + 1) * LANCAMENTOS_POR_PAGINA);
  const total = lancamentos.reduce((s, l) => s + (l.valor || 0), 0);
  const resumo = resumoCliente(guildId, clienteId);

  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(totalPaginas > 1 ? `🗑️ Remover lançamento (${paginaAtual + 1}/${totalPaginas})` : '🗑️ Remover lançamento')
    .setDescription(
      `👤 Cliente: <@${clienteId}>\n\n` +
      (lancamentos.length
        ? 'Escolha no menu abaixo o lançamento que entrou **a mais** para remover.\n' +
          '*O valor e as vendas saem do gasto do cliente. Cargos já conquistados não são removidos.*'
        : '*Nenhum lançamento manual para este cliente.*')
    )
    .addFields(
      { name: '💰 Gasto total', value: formatBRL(resumo.acumulado.gasto || 0), inline: true },
      { name: '🛍️ Vendas', value: `${resumo.acumulado.vendas || 0}`, inline: true },
      { name: '🧾 Lançado manualmente', value: `${formatBRL(total)} (${lancamentos.length})`, inline: true }
    )
    .setFooter({ text: 'Só lançamentos manuais (!venda / /venda) aparecem aqui.' });

  if (!lancamentos.length) return { embeds: [embed], components: [] };

  const opcoes = visiveis.map((l) => {
    const qtd = l.quantidade > 1 ? ` (${l.quantidade}x)` : '';
    return {
      label: `#${l.id} — ${formatBRL(l.valor)}${qtd}`.slice(0, 100),
      description: `${dataLancamento(l.registradoEm)}${l.descricao ? ` • ${l.descricao}` : ''}`.slice(0, 100),
      value: l.id,
    };
  });

  const components = [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`venda:remover:${clienteId}:${paginaAtual}`)
        .setPlaceholder('🗑️ Selecione o lançamento a remover')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(opcoes)
    ),
  ];

  if (totalPaginas > 1) {
    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`venda:pag:${clienteId}:${paginaAtual - 1}`).setLabel('◀️ Anterior').setStyle(ButtonStyle.Primary).setDisabled(paginaAtual === 0),
      new ButtonBuilder().setCustomId(`venda:pag:${clienteId}:${paginaAtual + 1}`).setLabel('Próxima ▶️').setStyle(ButtonStyle.Primary).setDisabled(paginaAtual >= totalPaginas - 1)
    ));
  }

  return { embeds: [embed], components };
}

// Confirmação antes de remover (evita clique errado apagar a venda).
function confirmarRemocaoLancamento(guildId, clienteId, lancamentoId) {
  const l = comprasStore.obterLancamento(guildId, lancamentoId);
  if (!l) {
    return {
      embeds: [new EmbedBuilder().setColor(0xe74c3c).setDescription('❌ Lançamento não encontrado (talvez já removido).')],
      components: [],
    };
  }
  const qtd = l.quantidade > 1 ? ` (${l.quantidade} vendas)` : '';
  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle('⚠️ Remover lançamento')
    .setDescription(
      `Confirma remover o lançamento **#${l.id}**?\n\n` +
      `💰 Valor: **${formatBRL(l.valor)}**${qtd}\n` +
      `📅 ${dataLancamento(l.registradoEm)}` +
      (l.descricao ? `\n📝 ${l.descricao}` : '') +
      '\n\n*O valor/vendas saem do gasto do cliente. Cargos já concedidos não são removidos.*'
    );
  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`venda:confrem:${clienteId}:${l.id}`).setLabel('Sim, remover').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`venda:listar:${clienteId}:0`).setLabel('Não').setStyle(ButtonStyle.Secondary)
    )],
  };
}

// Embed de confirmação do que foi removido, com o novo gasto do cliente.
function embedRemocaoFeita(removido, clienteId, resumo) {
  const qtd = removido.quantidade > 1 ? ` (${removido.quantidade} vendas)` : '';
  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle('✅ Lançamento removido')
    .setDescription(
      `Removido o lançamento **#${removido.id}**: **${formatBRL(removido.valor)}**${qtd}\n` +
      (removido.descricao ? `📝 ${removido.descricao}\n` : '') +
      `\n👤 Novo gasto de <@${clienteId}>: **${formatBRL(resumo.acumulado.gasto || 0)}** em **${resumo.acumulado.vendas || 0}** venda(s).`
    )
    .setFooter({ text: 'Cargos já conquistados não são removidos.' });
}

module.exports = { parseValor, parseQuantidade, lancarVenda, resumoCliente, embedLancamento, embedResumoCliente, painelRemoverLancamento, confirmarRemocaoLancamento, embedRemocaoFeita };
