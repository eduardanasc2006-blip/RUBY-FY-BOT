const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder,
} = require('discord.js');
const estoque = require('./estoque');
const encomendaStore = require('./encomendaStore');
const { formatBRL } = require('./robuxConverter');

// Painel PUBLICO da encomenda no ticket (mesmo padrao do comprarPanel).
// Fluxo separado do /comprar: nao reserva nem baixa estoque.

const COR = 0x9b59b6;

function btn(customId, label, style = ButtonStyle.Secondary) {
  return new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(style);
}

function row(...btns) {
  return new ActionRowBuilder().addComponents(...btns);
}

function statusTexto(status) {
  const s = encomendaStore.STATUS[status];
  return s ? `${s.emoji} ${s.texto}` : String(status || '');
}

function cabecalhoEncomenda(e) {
  return [
    `📦 **Encomenda:** #${e.id}`,
    `👤 **Cliente:** <@${e.clienteId}>`,
    `🪪 **ID do cliente:** \`${e.clienteId}\``,
    '',
    `📦 **Item:** ${e.itemNome} × ${e.quantidade}`,
    `💰 **Valor:** ${formatBRL(e.valor)}`,
    '',
    `💳 **Entrada:** ${formatBRL(e.entrada)}`,
    `💵 **Restante:** ${formatBRL(e.restante)}`,
  ];
}

// ----- Tela 1: escolher categoria -----
function escolherCategoria(guildId) {
  const cats = estoque.categorias(guildId);
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('📦 ENCOMENDA — Passo 1 de 3')
    .setDescription(
      cats.length
        ? '**Escolha a categoria do item que você deseja encomendar:**'
        : '*Nenhuma categoria cadastrada no estoque.*'
    );
  const linhas = [];
  cats.slice(0, 15).forEach((c) => {
    if (!linhas.length || linhas[linhas.length - 1].components.length === 5) linhas.push(new ActionRowBuilder());
    linhas[linhas.length - 1].addComponents(
      btn(`enc:cat:${c.id}`, `${c.emoji || '📦'} ${c.nome}`, ButtonStyle.Primary)
    );
  });
  return { embeds: [embed], components: linhas };
}

// ----- Tela 2: escolher produto (qualquer produto da categoria, mesmo sem estoque) -----
function escolherProduto(guildId, catId) {
  const cat = estoque.categoria(guildId, catId);
  if (!cat) return escolherCategoria(guildId);
  const produtos = cat.produtos.filter((p) => p.ativo);
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(`${cat.emoji || '📦'} ${cat.nome} — Passo 2 de 3`)
    .setDescription(
      produtos.length
        ? '**Escolha o item que deseja encomendar:**\n*Encomendas são para itens fora do estoque imediato.*'
        : '*Nenhum produto disponível nesta categoria.*'
    );
  const linhas = [];
  produtos.slice(0, 15).forEach((p) => {
    if (!linhas.length || linhas[linhas.length - 1].components.length === 5) linhas.push(new ActionRowBuilder());
    linhas[linhas.length - 1].addComponents(
      btn(`enc:prod:${catId}:${p.id}`, `${p.nome} — ${formatBRL(p.valor)}`, ButtonStyle.Primary)
    );
  });
  linhas.push(row(btn('enc:voltar', '⬅️ Voltar às categorias', ButtonStyle.Secondary)));
  return { embeds: [embed], components: linhas };
}

// ----- Tela 3: escolher quantidade -----
function escolherQuantidade(guildId, catId, prodId) {
  const p = estoque.produto(guildId, catId, prodId);
  if (!p) return escolherCategoria(guildId);
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(`🔢 ${p.nome} — Passo 3 de 3`)
    .setDescription(
      `**Preço:** ${formatBRL(p.valor)} cada\n\n` +
      'Escolha a quantidade que deseja encomendar.'
    );
  const quantidades = [1, 2, 3, 5, 10];
  const linhas = [];
  quantidades.forEach((q) => {
    if (!linhas.length || linhas[linhas.length - 1].components.length === 5) linhas.push(new ActionRowBuilder());
    linhas[linhas.length - 1].addComponents(btn(`enc:qtd:${catId}:${prodId}:${q}`, `${q}x`, ButtonStyle.Secondary));
  });
  linhas.push(row(btn(`enc:prod:${catId}`, '⬅️ Voltar aos produtos', ButtonStyle.Secondary)));
  return { embeds: [embed], components: linhas };
}

// ----- Tela 4: resumo antes de confirmar -----
function resumoEncomenda(guildId, { catId, prodId, quantidade, clienteId }) {
  const p = estoque.produto(guildId, catId, prodId);
  if (!p || !p.ativo) return null;
  const calc = encomendaStore.calcularEntrada((p.valor || 0) * quantidade);
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('📦 RESUMO DA ENCOMENDA')
    .setDescription(
      `👤 **Cliente:** <@${clienteId}>\n\n` +
      `📦 **Item:** ${p.nome} × ${quantidade}\n` +
      `💰 **Valor:** ${formatBRL(calc.total)}\n\n` +
      `💳 **Entrada (50%):** ${formatBRL(calc.entrada)}\n` +
      `💵 **Restante (50%):** ${formatBRL(calc.restante)}\n\n` +
      `⏳ **Prazo:** até ${encomendaStore.PRAZO_HORAS}h\n\n` +
      '*Confirme para abrir a encomenda. A entrada de 50% deve ser paga antes do início da encomenda. A equipe confere o comprovante manualmente.*'
    );
  return {
    embeds: [embed],
    components: [row(
      btn(`enc:conf:${catId}:${prodId}:${quantidade}`, '✅ Confirmar encomenda', ButtonStyle.Success),
      btn('enc:voltar', '🔙 Cancelar', ButtonStyle.Secondary),
    )],
  };
}

// ----- Mensagem publica da encomenda no ticket -----
function componentesDaEncomenda(e) {
  if (e.status === 'aguardando') {
    return [row(
      btn(`enc:iniciar:${e.id}`, '▶️ Iniciar encomenda', ButtonStyle.Primary),
      btn(`enc:cancelar:${e.id}`, '❌ Cancelar', ButtonStyle.Danger),
    )];
  }
  if (e.status === 'em_andamento') {
    return [row(
      btn(`enc:recebido:${e.id}`, '📦 Item recebido', ButtonStyle.Primary),
      btn(`enc:cancelar:${e.id}`, '❌ Cancelar', ButtonStyle.Danger),
    )];
  }
  if (e.status === 'item_recebido') {
    return [row(
      btn(`enc:entregar:${e.id}`, '🚚 Marcar como entregue', ButtonStyle.Success),
      btn(`enc:cancelar:${e.id}`, '❌ Cancelar', ButtonStyle.Danger),
    )];
  }
  return [];
}

// Linha de auditoria (quem fez cada etapa e quando).
function registroDaEncomenda(e) {
  const linhas = [];
  if (e.iniciadoEm) linhas.push(`▶️ Iniciada por <@${e.iniciadoPor}>`);
  if (e.recebidoEm) linhas.push(`📦 Item recebido por <@${e.recebidoPor}>`);
  if (e.entregueEm) linhas.push(`🚚 Entregue por <@${e.entreguePor}>`);
  if (e.canceladoEm) linhas.push(`❌ Cancelada por <@${e.canceladoPor}>`);
  return linhas.length ? linhas.join('\n') : null;
}

function mensagemEncomenda(guildId, e) {
  const atual = encomendaStore.obter(guildId, e.id) || e;
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(`📦 ENCOMENDA #${atual.id}`)
    .setDescription(
      `📦 **Item:** ${atual.itemNome} × ${atual.quantidade}\n` +
      `💰 **Valor:** ${formatBRL(atual.valor)}\n\n` +
      `💳 **Entrada:** ${formatBRL(atual.entrada)}\n` +
      `💵 **Restante:** ${formatBRL(atual.restante)}\n\n` +
      `${statusTexto(atual.status)}`
    )
    .addFields({ name: '👤 Cliente', value: `${atual.clienteTag || `<@${atual.clienteId}>`} (\`${atual.clienteId}\`)`, inline: true });
  const registro = registroDaEncomenda(atual);
  if (registro) embed.addFields({ name: '🔎 Registro', value: registro });
  if (atual.status === 'aguardando') {
    embed.addFields({ name: '⏳ Prazo', value: `até ${encomendaStore.PRAZO_HORAS}h`, inline: true });
  }
  return { embeds: [embed], components: componentesDaEncomenda(atual) };
}

function confirmacaoCancelamentoEncomenda(e) {
  const atual = encomendaStore.obter(e.guildId, e.id) || e;
  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle('⚠️ Cancelar encomenda')
    .setDescription(
      `Tem certeza que deseja cancelar a encomenda **#${atual.id}**?\n\n` +
      (atual.status === 'aguardando'
        ? '*A encomenda ainda não foi iniciada.*'
        : '*A encomenda já foi iniciada. Confirme se deseja cancelar.*')
    );
  return {
    embeds: [embed],
    components: [row(
      btn(`enc:confcanc:${atual.id}`, '✅ Sim, cancelar', ButtonStyle.Danger),
      btn(`enc:voltcanc:${atual.id}`, '🔙 Não', ButtonStyle.Secondary),
    )],
  };
}

// ----- Log no canal de logs de compras (infra existente) -----
// Titulos ENCOMENDA */📦 deixam claro que nao e uma log de /comprar.
function logDaEncomenda(e, { acao = 'criada', por = null } = {}) {
  const cabecalhos = {
    criada: { titulo: '📦 ENCOMENDA CRIADA', cor: 0x9b59b6 },
    iniciada: { titulo: '🟠 ENCOMENDA INICIADA', cor: 0xe67e22 },
    recebida: { titulo: '🔵 ITEM RECEBIDO', cor: 0x3498db },
    entregue: { titulo: '🟢 ENCOMENDA ENTREGUE', cor: 0x2ecc71 },
    cancelada: { titulo: '🔴 ENCOMENDA CANCELADA', cor: 0xe74c3c },
  };
  const { titulo, cor } = cabecalhos[acao] || cabecalhos.criada;

  // O status exibido e o do EVENTO, nao o status atual do registro: senao um log
  // antigo (ex.: "ENCOMENDA CRIADA") mostraria o estado mais recente.
  const statusDoEvento = {
    criada: 'aguardando',
    iniciada: 'em_andamento',
    recebida: 'item_recebido',
    entregue: 'entregue',
    cancelada: 'cancelada',
  }[acao] || e.status;

  const autor = por || {
    iniciada: e.iniciadoPor,
    recebida: e.recebidoPor,
    entregue: e.entreguePor,
    cancelada: e.canceladoPor,
  }[acao] || null;

  const quando = {
    criada: e.criadoEm,
    iniciada: e.iniciadoEm,
    recebida: e.recebidoEm,
    entregue: e.entregueEm,
    cancelada: e.canceladoEm,
  }[acao];

  const d = new Date(quando || Date.now());
  const data = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const hora = d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

  const linhas = [
    `🧾 **Encomenda:** #${e.id}`,
    `👤 **Cliente:** <@${e.clienteId}>`,
    `🪪 **ID do cliente:** \`${e.clienteId}\``,
    '',
    `📦 **Item:** ${e.itemNome} × ${e.quantidade}`,
    `💰 **Total:** **${formatBRL(e.valor)}**`,
    `💳 **Entrada:** ${formatBRL(e.entrada)}`,
    `💵 **Restante:** ${formatBRL(e.restante)}`,
    `📊 **Status:** ${statusTexto(statusDoEvento)}`,
  ];
  if (autor) linhas.push(`👮 **Responsável:** <@${autor}>`);
  linhas.push(`🕐 **Data:** ${data} às ${hora}`);

  return { titulo, descricao: linhas.join('\n'), cor, campos: [], timestamp: true };
}

module.exports = {
  COR,
  escolherCategoria,
  escolherProduto,
  escolherQuantidade,
  resumoEncomenda,
  mensagemEncomenda,
  confirmacaoCancelamentoEncomenda,
  componentesDaEncomenda,
  statusTexto,
  logDaEncomenda,
};