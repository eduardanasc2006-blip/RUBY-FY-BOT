const nodeFs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

const COR = 0xbeb6ff;

function carregarJson(file) {
  try {
    return JSON.parse(nodeFs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function salvarJson(file, dados) {
  nodeFs.mkdirSync(path.dirname(file), { recursive: true });
  nodeFs.writeFileSync(file, JSON.stringify(dados, null, 2));
}

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const PANEL_FILE = path.join(DATA_DIR, 'panel.json'); // legado (global) — migrado por guild
const ESTOQUE_FILE = path.join(DATA_DIR, 'painel_estoque.json'); // legado (global) — migrado por guild
const CATEGORIA_FILE = path.join(DATA_DIR, 'painel_categoria.json'); // legado (global) — migrado por guild
const PAINEIS_DIR = path.join(DATA_DIR, 'paineis');

function arquivoGuild(guildId) {
  return path.join(PAINEIS_DIR, `${guildId || 'global'}.json`);
}

// Carrega os registros por-guild, migrando o legado global na primeira vez.
function carregarRegistros(guildId) {
  const def = { conversao: null, estoque: null, categorias: {} };
  if (!guildId) {
    return {
      conversao: carregarJson(PANEL_FILE),
      estoque: carregarJson(ESTOQUE_FILE),
      categorias: carregarJson(CATEGORIA_FILE) || {},
    };
  }
  const arq = arquivoGuild(guildId);
  const local = carregarJson(arq);
  if (local) return { ...def, ...local };
  // Migração única do legado global (se existir)
  const legado = { conversao: carregarJson(PANEL_FILE), estoque: carregarJson(ESTOQUE_FILE), categorias: carregarJson(CATEGORIA_FILE) || {} };
  let temLegado = false;
  for (const k of ['conversao', 'estoque']) if (legado[k]) temLegado = true;
  if (Object.keys(legado.categorias).length) temLegado = true;
  if (temLegado) {
    salvarJson(arq, legado);
    return legado;
  }
  salvarJson(arq, def);
  return def;
}

function readConversao(guildId) { return carregarRegistros(guildId || 'global').conversao; }
function readEstoque(guildId) { return carregarRegistros(guildId || 'global').estoque; }
function readCategorias(guildId) { return carregarRegistros(guildId || 'global').categorias || {}; }

// Monta o painel central: estado de cada painel fixo + botoes para publicar/atualizar
function buildPainelCentral(guildId) {
  const registros = carregarRegistros(guildId);
  const conv = registros.conversao;
  const est = registros.estoque;
  const cats = registros.categorias || {};

  const linhas = [
    '🟣 **Painel de conversão** — ' + (conv ? '✅ fixado' : '➖ não publicado'),
    '📦 **Painel de estoque** — ' + (est ? '✅ fixado' : '➖ não publicado'),
  ];

  const categorias = Object.entries(cats);
  if (categorias.length) {
    for (const [, info] of categorias) {
      const catId = typeof info === 'string' ? info : info.catId;
      linhas.push(`🎯 **${catId}** — ✅ fixado`);
    }
  }

  linhas.push('');
  linhas.push('Use os botões para **publicar ou atualizar** cada painel no canal atual.');

  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('🗂️ Gerenciar painéis')
    .setDescription(linhas.join('\n'));

  const componentes = [];

  const linha1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('painelcenter:conversao')
      .setLabel('🟣 Conversão')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('painelcenter:estoque')
      .setLabel('📦 Estoque')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('painelcenter:criarcategoria')
      .setLabel('🎯 Criar painel de categoria')
      .setStyle(ButtonStyle.Success)
  );
  componentes.push(linha1);

  // Se ha categorias fixadas, oferece um botao para re-fixar cada uma no canal atual
  if (categorias.length) {
    const linha2 = new ActionRowBuilder();
    for (const [msgId, info] of categorias) {
      if (linha2.components.length === 5) break; // max 5 por linha
      const catId = typeof info === 'string' ? info : info.catId;
      linha2.addComponents(
        new ButtonBuilder()
          .setCustomId(`painelcenter:cat:${catId}`)
          .setLabel(`🎯 ${catId.slice(0, 40)}`)
          .setStyle(ButtonStyle.Secondary)
      );
    }
    if (linha2.components.length) componentes.push(linha2);
  }

  // Botões para remover painel fixo (com confirmação no handler).
  // Cada um usa um customId próprio; se não houver nada para remover, esta linha some.
  const linhaRemover = new ActionRowBuilder();
  if (conv) {
    linhaRemover.addComponents(
      new ButtonBuilder()
        .setCustomId('painelcenter:remconversao')
        .setLabel('🛑 Remover conversão')
        .setStyle(ButtonStyle.Danger)
    );
  }
  if (est) {
    linhaRemover.addComponents(
      new ButtonBuilder()
        .setCustomId('painelcenter:remestoque')
        .setLabel('🛑 Remover estoque')
        .setStyle(ButtonStyle.Danger)
    );
  }
  for (const [msgId, info] of categorias) {
    if (linhaRemover.components.length === 5) break;
    const catId = typeof info === 'string' ? info : info.catId;
    linhaRemover.addComponents(
      new ButtonBuilder()
        .setCustomId(`painelcenter:remcategoria:${msgId}:${catId}`)
        .setLabel(`🛑 Cat. ${catId.slice(0, 15)}`)
        .setStyle(ButtonStyle.Danger)
    );
  }
  if (linhaRemover.components.length) componentes.push(linhaRemover);

  return { embeds: [embed], components: componentes };
}

// Converte em uma resposta privada (ephemeral)
function privar(data) {
  if (typeof data === 'string') return { content: data, flags: MessageFlags.Ephemeral };
  return { ...data, flags: MessageFlags.Ephemeral };
}

module.exports = {
  buildPainelCentral,
  readConversao,
  readEstoque,
  readCategorias,
  salvarConversao: (guildId, ref) => {
    const registros = carregarRegistros(guildId);
    registros.conversao = ref;
    salvarJson(arquivoGuild(guildId), registros);
    // Mantém o legado global atualizado também (compatibilidade com versões antigas)
    salvarJson(PANEL_FILE, ref);
  },
  salvarEstoque: (guildId, ref) => {
    const registros = carregarRegistros(guildId);
    registros.estoque = ref;
    salvarJson(arquivoGuild(guildId), registros);
    salvarJson(ESTOQUE_FILE, ref);
  },
  salvarCategoria: (guildId, msgId, catId, channelId) => {
    const registros = carregarRegistros(guildId);
    registros.categorias = registros.categorias || {};
    registros.categorias[msgId] = { catId, channelId };
    salvarJson(arquivoGuild(guildId), registros);
    // Espelha no legado global para compatibilidade
    const cats = carregarJson(CATEGORIA_FILE) || {};
    cats[msgId] = { catId, channelId };
    salvarJson(CATEGORIA_FILE, cats);
  },
  privar,
};