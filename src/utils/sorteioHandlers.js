const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const sorteioStore = require('./sorteioStore');
const sorteioRender = require('./sorteioRender');
const { comandoPode } = require('./permissions');

const MS = 60000;

function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function registrar(client) {
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isModalSubmit() && interaction.customId.startsWith('sorteio:modal:')) {
        const [, , , guildId] = interaction.customId.split(':');
        const titulo = interaction.fields.getTextInputValue('premio') || 'Sorteio';
        const descricao = interaction.fields.getTextInputValue('descricao') || '';
        const canalId = interaction.fields.getTextInputValue('canal') || interaction.channelId;
        const horas = Number(interaction.fields.getTextInputValue('duracao')) || 24;
        const qtd = Number(interaction.fields.getTextInputValue('vencedores')) || 1;
        const criadorId = interaction.user.id;
        const fimEm = Date.now() + Math.max(1, Math.min(horas, 720)) * 3600000;
        const sorteio = {
          id: gerarId(),
          premio: titulo,
          descricao,
          canalId,
          criadorId,
          participantes: [criadorId],

          vencedores: [],
          qtdVencedores: qtd,
          fimEm,
          encerrado: false,
          msgId: null,
        };
        sorteioStore.salvarSorteio(guildId, sorteio.id, sorteio);
        await sorteioRender.renderizar(client, guildId, sorteio.id, sorteio, canalId, criadorId, false);
        return interaction.reply({ content: '✅ Sorteio criado!', flags: MessageFlags.Ephemeral });
      }

      if (interaction.isButton() && interaction.customId.startsWith('sorteio:participar:')) {
        const [, , guildId, id] = interaction.customId.split(':');
        const sorteio = sorteioStore.obter(guildId, id);
        if (!sorteio || sorteio.encerrado) {

          return interaction.reply({ content: '❌ Este sorteio não está mais ativo.', flags: MessageFlags.Ephemeral });
        }
        if (!sorteio.participantes.includes(interaction.user.id)) {

          sorteio.participantes.push(interaction.user.id);
          sorteioStore.salvarSorteio(guildId, id, sorteio);
          const canal = await client.channels.fetch(sorteio.canalId.catch(() => null));
          if (canal && canal.isTextBased() && sorteio.msgId) {

            const m = await canal.messages.fetch(sorteio.msgId.catch(() => null));
            if (m) {
              const { embed } = sorteioRender.montarEmbed(sorteio);
              await m.edit({ embeds: [embed], components: sorteioRender.montarComponentes(sorteio, interaction.user.id, guildId, id) });
            }
          }
        }
        return interaction.reply({ content: '✅ Você está participando do sorteio!', flags: MessageFlags.Ephemeral });
      }

      if (interaction.isButton() && interaction.customId.startsWith('sorteio:refazer:')) {
        const [, , uid, guildId, id] = interaction.customId.split(':');
        if (interaction.user.id !== uid) {

          return interaction.reply({ content: '❌ Só quem criou pode refazer o sorteio.', flags: MessageFlags.Ephemeral });
        }
        const sorteio = sorteioStore.obter(guildId, id);
        if (!sorteio || sorteio.encerrado)return interaction.reply({ content: '❌ Este sorteio não está mais ativo.', flags: MessageFlags.Ephemeral });
        sorteio.participantes = [interaction.user.id];
        sorteioStore.salvarSorteio(guildId, id, sorteio);
        const canal = await client.channels.fetch(sorteio.canalId.catch(() => null));
        if (canal && canal.isTextBased() && sorteio.msgId) {

          const m = await canal.messages.fetch(sorteio.msgId.catch(() => null));
          if (m) {
            const { embed } = sorteioRender.montarEmbed(sorteio);
            await m.edit({ embeds: [embed], components: sorteioRender.montarComponentes(sorteio, interaction.user.id, guildId, id) });
          }
        }
        return interaction.reply({ content: '🔁 Participantes reiniciados!', flags: MessageFlags.Ephemeral });
      }

      if (interaction.isButton() && interaction.customId.startsWith('sorteio:encerrar:')) {
        const [, , uid, guildId, id] = interaction.customId.split(':');
        if (interaction.user.id !== uid && !comandoPode(interaction.member, interaction.user.id, 'sorteio')) {


          return interaction.reply({ content: '🔒 Somente administradores podem encerrar o sorteio.', flags: MessageFlags.Ephemeral });
        }
        await sorteioRender.encerrar(client, guildId, id);
        return interaction.reply({ content: '🏁 Sorteio encerrado!', flags: MessageFlags.Ephemeral });
      }
    } catch (error) {
      console.error('[Sorteio] Erro:', error);
    }
  });
}

module.exports = { registrar };