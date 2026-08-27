const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, RoleSelectMenuBuilder } = require('discord.js');
const { GRUPOS, cargosDoGrupo } = require('./permissions');

const COR = 0xbeb6ff;
const btn = (id, label, style = ButtonStyle.Secondary, emoji) => {
  const b = new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style);
  if (emoji) b.setEmoji(emoji);
  return b;
};

// Painel principal: lista os grupos e quantos cargos têm acesso.
function buildPermissionsPanel(guild, userId) {
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('🛡️ Permissões por Cargo')
    .setDescription(
      'Defina **quais cargos** podem usar cada grupo de comandos.\n' +
      'Quem tiver **Administrador** ou estiver no **ADMIN_IDS** sempre poderá usar tudo.\n\n' +
      'Clique em um grupo abaixo para gerenciar os cargos:'
    );

  const linhas = [];
  // Até 4 grupos por linha
  for (let i = 0; i < GRUPOS.length; i++) {
    if (i % 4 === 0) linhas.push(new ActionRowBuilder());
    const g = GRUPOS[i];
    const qtd = cargosDoGrupo(g.id).length;
    linhas[linhas.length - 1].addComponents(
      new ButtonBuilder()
        .setCustomId(`perm:grupo:${g.id}:${userId}`)
        .setLabel(`${g.nome.replace(/[^\p{L}\p{N}\s]/gu, '').trim()} (${qtd})`)
        .setStyle(ButtonStyle.Secondary)
    );
  }

  return {
    embeds: [embed],
    components: linhas,
  };
}

// Painel de um grupo: mostra os cargos atuais + seletor de cargo.
function buildGrupoPanel(guild, grupoId, userId) {
  const grupo = GRUPOS.find((g) => g.id === grupoId);
  if (!grupo) return { content: '❌ Grupo não encontrado.', embeds: [], components: [] };

  const cargos = cargosDoGrupo(grupoId)
    .map((id) => guild?.roles?.cache?.get(id))
    .filter(Boolean);
  const listaCargos = cargos.map((r) => `${r}`).join(' ') || '*Nenhum cargo ainda.*';

  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(`${grupo.nome}`)
    .setDescription(
      `**${grupo.descricao}**\n\n` +
      `**Cargos com acesso:**\n${listaCargos}\n\n` +
      `_Selecione cargos no menu abaixo para adicionar. Para remover, use o botão **Remover** e escolha._`
    );

  const nomeLimpo = grupo.id; // id do grupo é seguro para customId
  const select = new RoleSelectMenuBuilder()
    .setCustomId(`perm:cargos:${nomeLimpo}:${userId}`)
    .setPlaceholder(`🎭 Adicionar cargos a "${grupo.nome.replace(/[^\p{L}\p{N}\s]/gu, '').trim()}"`)
    .setMinValues(0)
    .setMaxValues(10);

  const botoes = new ActionRowBuilder().addComponents(
    btn(`perm:remover:${nomeLimpo}:${userId}`, '🗑️ Remover cargo', ButtonStyle.Danger),
    btn(`perm:voltar:${userId}`, '⬅️ Voltar', ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(select),
      botoes,
    ],
  };
}

// Lista para escolher qual cargo remover do grupo.
function buildRemoverPanel(guild, grupoId, userId) {
  const grupo = GRUPOS.find((g) => g.id === grupoId);
  const cargos = cargosDoGrupo(grupoId)
    .map((id) => guild?.roles?.cache?.get(id))
    .filter(Boolean);

  if (!cargos.length) {
    return {
      content: `ℹ️ **${grupo?.nome}** não tem cargos configurados.`,
      embeds: [],
      components: [new ActionRowBuilder().addComponents(btn(`perm:grupo:${grupoId}:${userId}`, '⬅️ Voltar', ButtonStyle.Secondary))],
    };
  }

  const linhas = [];
  for (let i = 0; i < cargos.length; i++) {
    if (i % 5 === 0) linhas.push(new ActionRowBuilder());
    linhas[linhas.length - 1].addComponents(
      new ButtonBuilder()
        .setCustomId(`perm:remover2:${grupoId}:${cargos[i].id}:${userId}`)
        .setLabel(cargos[i].name.slice(0, 80))
        .setStyle(ButtonStyle.Danger)
    );
  }
  linhas.push(new ActionRowBuilder().addComponents(btn(`perm:grupo:${grupoId}:${userId}`, '⬅️ Voltar', ButtonStyle.Secondary)));

  return {
    content: `🗑️ **${grupo?.nome}** — escolha o cargo para remover:`,
    embeds: [],
    components: linhas,
  };
}

module.exports = { buildPermissionsPanel, buildGrupoPanel, buildRemoverPanel };