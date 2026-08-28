// Handlers extras: /mensagem (painel de publicacao) e /lock e /unlock.
// Registrados via registrar(client) para manter o index.js enxuto.

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { comandoPode } = require('./permissions');
const { linhaSelecaoCanalDe, resolverSelecaoCanal } = require('./channelPicker');
const { urlValida } = require('./embedPainel');
const { getSessao, limparSessao, buildEmbed, buildPainel, buildPreview } = require('./mensagemPainel');
const { capturarEstado, guardarEstado, estadoSalvo } = require('./channelLock');


function pode(interaction, cmd) {
  return comandoPode(interaction.member, interaction.user.id, cmd);
}


function registrar(client) {
  client.on('interactionCreate', async (interaction) => {
    try {
      // ---------- Painel de edicao da mensagem ----------
      if (interaction.isButton() && interaction.customId.startsWith('msgpainel:')) {
        const partes = interaction.customId.split(':');
        const acao = partes[1];
        const donoId = partes[2];
        if (interaction.user.id !== donoId) {

          return interaction.reply({ content: '🔒 Este painel não é seu.', flags: MessageFlags.Ephemeral });
        }
        if (!pode(interaction, 'mensagem')) {
          return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
        }
        const estado = getSessao(donoId);

        const abrirModal = (campo, titulo, label, multiline = false) => {
          const atual = estado[campo] || '';
          const modal = new ModalBuilder()
            .setCustomId(`msgmodal:${campo}:${donoId}`)
            .setTitle(titulo)
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('valor')
                  .setLabel(label)
                  .setStyle(multiline ? TextInputStyle.Paragraph : TextInputStyle.Short)
                  .setRequired(false)
                  .setValue(atual)
                )
              );
        };

        if (acao === 'mensagem') return abrirModal('mensagem', '📝 Mensagem', 'Texto da mensagem', true);
        if (acao === 'imagem') return abrirModal('imagem', '🖼️ Imagem', 'URL da imagem (ou vazio para remover)');
        if (acao === 'preview') return interaction.update(buildPreview(donoId));
        if (acao === 'voltar') return interaction.update(buildPainel(donoId));
        if (acao === 'publicar') {
          if (!estado.mensagem && !estado.imagem) {

            return interaction.reply({ content: '❌ Preencha a mensagem ou escolha uma imagem.', flags: MessageFlags.Ephemeral });
          }
          const canais = linhaSelecaoCanalDe(interaction.guild, `msgcanal:${donoId}`, interaction.channel.id, '📣 Escolha o canal para publicar…');
          if (!canais.canais.length) {
            return interaction.reply({ content: '❌ Não encontrei nenhum canal para publicar.', flags: MessageFlags.Ephemeral });
          }
          const preview = buildEmbed(estado);
          return interaction.update({
            content: '🗂️ **Onde deseja publicar?**\n_Selecione um canal abaixo ou use **📌 Canal atual**._',
            embeds: preview ? [new EmbedBuilder().setColor(0xbeb6ff).setDescription('👁️ Isto será publicado:'), preview] : [new EmbedBuilder().setColor(0xbeb6ff).setDescription('👁️ Isto será publicado:')],
            components: [canais.row, canais.botoes],
          });
        }
        if (acao === 'cancelar') {
            limparSessao(donoId);
          return interaction.update({ content: '❌ Publicação cancelada.', embeds: [], components: [] });
        }
        return;
      }

      // ---------- Modais da mensagem ----------
      if (interaction.isModalSubmit() && interaction.customId.startsWith('msgmodal:')) {
        const partes = interaction.customId.split(':');
        const campo = partes[1];
        const donoId = partes[2];
        if (interaction.user.id !== donoId) {

          return interaction.reply({ content: '🔒 Este painel não é seu.', flags: MessageFlags.Ephemeral });
        }
        const estado = getSessao(donoId);
        const valor = interaction.fields.getTextInputValue('valor').trim();
        if (campo === 'imagem') {
          if (valor && !urlValida(valor)) {
            return interaction.reply({ content: '❌ URL de imagem inválida. Use um link completo com http(s)://. Deixe vazio para remover.', flags: MessageFlags.Ephemeral });
          }
          estado.imagem = valor || null;
        } else {
          estado.mensagem = valor || null;
        }
          return interaction.update(buildPainel(donoId));
      }

      // ---------- Selecao de canal da mensagem ----------
      if ((interaction.isStringSelectMenu() || interaction.isButton()) && interaction.customId.startsWith('msgcanal:')) {
        const partes = interaction.customId.split(':');
        const donoId = partes[1];
        if (interaction.user.id !== donoId) {

          return interaction.reply({ content: '🔒 Este painel não é seu.', flags: MessageFlags.Ephemeral });
        }
        if (!pode(interaction, 'mensagem')) {
          return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
       }
        if (interaction.isButton() && partes[2] === 'cancelar') {
          limparSessao(donoId);
          return interaction.reply({ content: '❌ Publicação cancelada.', flags: MessageFlags.Ephemeral });
       }
        const { canal } = resolverSelecaoCanal(interaction, `msgcanal:${donoId}`);
        if (!canal || !canal.isTextBased() || !canal.permissionsFor(interaction.guild.members.me)?.has('SendMessages')) {
          return interaction.reply({ content: '❌ Canal não encontrado ou sem permissão de envio para mim.', flags: MessageFlags.Ephemeral });
       }
        const estado = getSessao(donoId);
        const embed = buildEmbed(estado);
        const conteudo = estado.mensagem || null;
        try {
            if (embed) await canal.send({ content: conteudo, embeds: [embed], allowedMentions: { parse: [] } });
            else await canal.send({ content: conteudo, allowedMentions: { parse: [] } });
          } catch (e) {
            console.error('[Mensagem] Falha ao publicar:', e?.message || e);
            return interaction.reply({ content: `❌ Não consegui publicar em <#${canal.id}>. Verifique minhas permissões no canal.`, flags: MessageFlags.Ephemeral });
          }
        limparSessao(donoId);
        return interaction.update({ content: `✅ Mensagem publicada em <#${canal.id}>!`, embeds: [], components: [] });
      }
    } catch (error) {
      console.error('[Mensagem] Erro:', error);
      try {
        if (!interaction.replied && !interaction.deferred) {

          await interaction.reply({ content: '❌ Ocorreu um erro.', flags: MessageFlags.Ephemeral });
        }
      } catch {}
    }
  });

  // ---------- /lock ----------
  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isButton() && interaction.customId.startsWith('lockconf:')) {
        const partes = interaction.customId.split(':');
        if (!pode(interaction, 'lock')) return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
        if (partes[1] === 'cancelar') return interaction.reply({ content: '❌ Cancelado.', flags: MessageFlags.Ephemeral });
        if (partes[1] !== 'confirmar') return;
        const canalLock = interaction.guild.channels.cache.get(partes[2]);
        if (!canalLock) return interaction.reply({ content: '❌ Canal não encontrado.', flags: MessageFlags.Ephemeral });
        const estadoAnt = capturarEstado(canalLock);
        guardarEstado(canalLock.id, estadoAnt);
        try {
          await canalLock.permissionOverwrites.edit(canalLock.guild.roles.everyone.id, { SendMessages: false });
        } catch (e) {
          console.error('[Lock] Falha:', e?.message || e);
          return interaction.reply({ content: '❌ Não consegui bloquear o canal.', flags: MessageFlags.Ephemeral });
        }
        return interaction.update({ content: `🔒 Canal bloqueado: ${canalLock}.`, embeds: [], components: [] });
      }
    } catch (error) {
      console.error('[Lock] Erro:', error);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ Ocorreu um erro.', flags: MessageFlags.Ephemeral });
        }
      } catch {}
    }
  });

  // ---------- /unlock ----------
  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isButton() && interaction.customId.startsWith('unlockconf:')) {
        const partes = interaction.customId.split(':');
        if (!pode(interaction, 'unlock')) return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
        if (partes[1] === 'cancelar') return interaction.reply({ content: '❌ Cancelado.', flags: MessageFlags.Ephemeral });
        if (partes[1] !== 'confirmar') return;
        const canalUnlock = interaction.guild.channels.cache.get(partes[2]);
        if (!canalUnlock) return interaction.reply({ content: '❌ Canal não encontrado.', flags: MessageFlags.Ephemeral });
        const estadoLock = estadoSalvo(canalUnlock.id);
        try {
          if (estadoLock) {
            await canalUnlock.permissionOverwrites.edit(canalUnlock.guild.roles.everyone.id
              , { SendMessages: estadoLock.allow ? true : estadoLock.deny ? false : null });
          } else {
            const overwrite2 = canalUnlock.permissionOverwrites.cache.get(canalUnlock.guild.roles.everyone.id);
            if (overwrite2) await overwrite2.delete('unlock pelo admin').catch(() => {});
          }
          guardarEstado(canalUnlock.id, null);
        } catch (e) {
          console.error('[Unlock] Falha:', e?.message || e);
          return interaction.reply({ content: '❌ Não consegui desbloquear o canal.', flags: MessageFlags.Ephemeral });
        }
        return interaction.update({ content: `🔓 Canal desbloqueado: ${canalUnlock}.`, embeds: [], components: [] });
      }
    } catch (error) {
      console.error('[Unlock] Erro:', error);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ Ocorreu um erro.', flags: MessageFlags.Ephemeral });
        }
      } catch {}
    }
  });
}

module.exports = { registrar };
