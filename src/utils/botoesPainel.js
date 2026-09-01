const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { getSessao, botoesEmLinhas, paginasValidas, camposValidos, urlValida } = require('./embedPainel');
const { sanitizarEmoji } = require('./sanitizarEmoji');

// Tela de gerenciamento dos botoes do editor de embed.
// Cada botao pode ser:
//  - link: abre uma URL (ButtonStyle.Link nativo)
//  - privado: ao clicar, somente quem clicou recebe um conteudo (ephemeral)
// O conteudo privado usa o mesmo modelo de "paginas" ja existente no editor
// (paginasValidas), apenas com um fluxo visual proprio parao botao.



function normBotoes(botoes) {
  if (!Array.isArray(botoes)) return [];
  return botoes
    .filter((b) => b && (b.rotulo || b.emoji))
    .slice(0, 10)
    .map((b) => ({
      rotulo: String(b.rotulo || '' ).slice(0, 80),
      emoji: sanitizarEmoji(b.emoji),
      acao:b.acao === 'privado' ? 'privado' : 'link',
      estilo:b.estilo || (b.acao === 'privado' ? 'secundario' : 'link'),
      valor: String(b.valor || '' ).trim(),
      paginas: Array.isArray(b.paginas) ? b.paginas : [],
    }));
}

// Resumo legivel do botao para o painel
function resumoBotao(b) {
  const rotulo = (b.rotulo || '(sem rotulo)').trim();
  const emoji = b.emoji ? `${b.emoji} ` : '';
  switch (b.acao) {
    case 'privado':
      return `🔒 ${emoji}**${rotulo}** — privado (so quem clica ve)`;
    default:
      return `🔗 ${emoji}**${rotulo}** — link: ${String(b.valor || '' ).slice(0, 40)}`;
  }
}

// Tela principal dos botoes: lista os atuais + acoes
function buildBotoesPainel(userId, guildId = '') {
  const estado = getSessao(userId);
  const botoes = normBotoes(estado.botoes);
  const linhasDesc = botoes.length
    ? botoes.map((b, i) => `**${i +  1}.** ${resumoBotao(b)}` )
    : ['*(nenhum botao ainda)*'];

  const embed = new EmbedBuilder()
    .setColor(0xbeb6ff)
    .setTitle('🔘 Botoes da mensagem')
    .setDescription([
      `**${botoes.length}** botao(oes) configurado(s.`,
      '',
      ...linhasDesc,
      '',
      'Botoes **privados** mostram uma resposta so para quem clicar (ex: 📋 Copiar PIX).',
    ].join('\n')
  );

  const botoesLinha1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`embedpainel:botaoadd:${userId}`).setLabel('➕ Adicionar botao').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`embedpainel:botaoed:${userId}`).setLabel('✏️ Editar botao').setStyle(ButtonStyle.Secondary)
      .setDisabled(!botoes.length),
    new ButtonBuilder().setCustomId(`embedpainel:botaorem:${userId}`).setLabel('🗑️ Remover botao').setStyle(ButtonStyle.Danger)
      .setDisabled(!botoes.length),
    new ButtonBuilder().setCustomId(`embedpainel:voltar:${userId}`).setLabel('⬅ Voltar ao editor').setStyle(ButtonStyle.Secondary)
  );

  const linhas = [botoesLinha1];

  // Select de botao para editar/remover
  if (botoes.length) {
    const select = new StringSelectMenuBuilder()
      .setCustomId(`embedpainel:botaosel:${userId}`)
      .setPlaceholder('Escolha o botao…')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        botoes.map((b, i) => ({
          label: `${i + 1}. ${(b.rotulo || 'sem rotulo').slice(0, 80)}`,
          value: String(i),
          description: (b.acao === 'privado' ? 'Privado (ephemeral)' : b.valor ? b.valor.slice(0, 80) : 'Link'),
        }))
      );
    linhas.push(new ActionRowBuilder().addComponents(select));
  }

  return { content: null, embeds: [embed], components: linhas };
}

// Modal de novo/edicao de botao (rotulo, emoji, estilo, acao, valor)
function buildBotaoModal(userId, idx = -1,guildId = '' ) {
  const estado = getSessao(userId);
  const botoes = normBotoes(estado.botoes);
  const b = idx >= 0 ? botoes[idx] : null;

  const customIdBase = idx >= 0 ? `embedmodal:botaosave:${userId}:${idx}` : `embedmodal:botaosave:${userId}`;

  return new ModalBuilder()
    .setCustomId(customIdBase)
    .setTitle(b ? `✏️ Editar botao ${idx + 1}` : '➕ Novo botao')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('rotulo')
          .setLabel('Nome do botao')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(80)
          .setValue(b ? String(b.rotulo || '' ).slice(0, 80) : '')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('emoji')
          .setLabel('Emoji (opcional, ex: 📋)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(32)
          .setValue(b ? String(b.emoji || '' ).slice(0, 32) : '')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('estilo')
          .setLabel('Estilo (primario, secundario, sucesso)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(16)
          .setValue(b && b.estilo ? b.estilo : 'secundario')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('acao')
          .setLabel('Acao: link (URL) ou privado (resposta)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(16)
          .setValue(b ? b.acao : 'privado')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('valor')
          .setLabel('Valor: URL (link) ou conteudo privado')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(4000)
          .setValue(b ? String(b.valor || '' ).slice(0, 4000) : '')
      )
    );
}

// ---- Conteudo privado do botao ----
// Cada botao "privado" guarda um mini-estado de paginas (reaproveitando
// paginasValidas do embedPainel) que abre so para quem clicar (ephemeral).

function buildBotaoPrivadoPainel(userId, idx) {
  const estado = getSessao(userId);
  const botoes = normBotoes(estado.botoes);
  const b = botoes[idx];
  if (!b) return { content: '❌ Botao nao encontrado.', embeds: [], components: [] };

  const paginaAtual = b.paginaIdx ?? 0;
  const paginas = paginasValidas(b.paginas);
  const pagina = paginas[Math.min(paginaAtual, Math.max(paginas.length -1,0))];


  const embedInfo = new EmbedBuilder()
    .setColor(0xbeb6ff)
    .setTitle(`🔒 Conteudo privado — ${b.rotulo || 'botao'}`)
    .setDescription([
      paginas.length
        ? `**${paginas.length}** pagina(s) configurada(s.`
        : '*(nenhum conteudo ainda — adicione uma pagina abaixo)*',
      '',
      'O botao mostra esta resposta **so para quem clicar** (ephemeral).',
    ].join('\n')
  );

  const linhas = [];
  const linha1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`embedpainel:botpagadd:${userId}:${idx}`).setLabel('➕ Criar conteúdo').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`embedpainel:botpaglimpar:${userId}:${idx}`).setLabel('🗑️ Limpar conteúdos').setStyle(ButtonStyle.Danger)
      .setDisabled(!paginas.length),
    new ButtonBuilder().setCustomId(`embedpainel:botoes:${userId}`).setLabel('⬅ Voltar aos botões').setStyle(ButtonStyle.Secondary)
  );
  linhas.push(linha1);

  // Select para editar uma pagina existente
  if (paginas.length) {
    const select = new StringSelectMenuBuilder()
      .setCustomId(`embedpainel:botpagsel:${userId}:${idx}`)
      .setPlaceholder('✏️ Escolha uma pagina para editar…')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        paginas.map((p, i) => ({
          label: `Pagina ${i + 1}: ${(p.titulo || p.descricao || 'sem titulo').slice(0, 80)}`,
          value: String(i),
          description: 'Editar conteudo privado',
        }))
      );
    linhas.push(new ActionRowBuilder().addComponents(select));
  }

  if (pagina) {
  // Preview do conteudo atual (se houver)
    const prevEmbed = new EmbedBuilder().setColor(0xbeb6ff);
    if (pagina.titulo) prevEmbed.setTitle(pagina.titulo);
    if (pagina.descricao) prevEmbed.setDescription(pagina.descricao);
    if (pagina.imagem) prevEmbed.setImage(pagina.imagem);
    if (pagina.thumbnail) prevEmbed.setThumbnail(pagina.thumbnail);
    if (pagina.fields.length) prevEmbed.addFields(pagina.fields);
    if (!pagina.descricao) prevEmbed.setDescription('\u200b');
    return { embeds: [embedInfo, prevEmbed], components: linhas };
  }

  return { embeds: [embedInfo], components: linhas };
}

module.exports = { buildBotoesPainel, buildBotaoModal, buildBotaoPrivadoPainel };