const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
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
        const partes = interaction.customId.split(':');
        const guildId = partes[3];
        const canalId = partes[4] && partes[4] !== 'none' ? partes[4] : (interaction.channelId || null);
        const cargoId = partes[5] && partes[5] !== 'none' ? partes[5] : null;
        const titulo = interaction.fields.getTextInputValue('premio') || 'Sorteio';
        const descricao = interaction.fields.getTextInputValue('descricao') || '';
        const duracaoTexto = interaction.fields.getTextInputValue('duracao') || '';
        const unidade = interaction.fields.getTextInputValue('unidade') || 'horas';
        const qtd = Number(interaction.fields.getTextInputValue('vencedores')) || 1;
        const criadorId = interaction.user.id;
        const duracaoNum = Number(duracaoTexto);
        const mult = unidade === 'minutos' ? 1 / 60 : unidade === 'dias' ? 24 : 1;
        const horasTotal = duracaoNum * mult;
        if (!duracaoNum || duracaoNum <=  0 || horasTotal >  720) {
          return interaction.reply({ content: '❌ Duração inválida. Use um número positivo (máx. 30 dias).', flags: MessageFlags.Ephemeral });
        }
        const fimEm = Date.now() + Math.round(horasTotal * 3600000);
        const sorteio = {
          id: gerarId(),
          premio: titulo,
          descricao,
          canalId,
          criadorId,
          participantes: [],
          cargoId,

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

      if (interaction.isButton() && interaction.customId.startsWith('sorteio:criar:')) {
          const [, , guildId, uid, canaisAlvo, cargoAlvo] = interaction.customId.split(':');
          if (interaction.user.id !== uid) {
            return interaction.reply({ content: '❌ Só quem abriu o painel pode criar o sorteio.', flags: MessageFlags.Ephemeral });
          }
          const modal = new ModalBuilder()
            .setCustomId('sorteio:modal:criar:' + guildId + ':' + (canaisAlvo || 'none') + ':' + (cargoAlvo || 'none'))
            .setTitle('🎉 Criar Sorteio')
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('premio').setLabel('Prêmio do sorteio').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100)
              ),
              new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('descricao').setLabel('Descrição (opcional; máx.)').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(4000)
              ),
              new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('duracao').setLabel('Duração (número)').setPlaceholder('Ex: 30').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(10)
              ),
              new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('unidade').setPlaceholder('Unidade de tempo').addOptions(
                  { label: 'Minutos', value: 'minutos' },
                  { label: 'Horas', value: 'horas' },
                  { label: 'Dias', value: 'dias' }
                )
              ),
              new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('vencedores').setLabel('Vencedores').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(10)
              )
            );
          return interaction.showModal(modal);
        }

        if (interaction.isButton() && interaction.customId.startsWith('sorteio:participar:')) {
        const [, , guildId, id] = interaction.customId.split(':');
        const sorteio = sorteioStore.obter(guildId, id);
        if (!sorteio || sorteio.encerrado) {

          return interaction.reply({ content: '❌ Este sorteio não está mais ativo.', flags: MessageFlags.Ephemeral });
        }
        if (sorteio.cargoId) {
          const membro = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
          if (!membro || !membro.roles.cache.has(sorteio.cargoId)) {

            return interaction.reply({ content: '❌ Você precisa do cargo <@&' + sorteio.cargoId + '> para participar deste sorteio.', flags: MessageFlags.Ephemeral });
          }
        }
        if (sorteio.participantes.includes(interaction.user.id)) {

          return interaction.reply({ content: '❌ Você já está participando deste sorteio!', flags: MessageFlags.Ephemeral });
        }
        sorteio.participantes.push(interaction.user.id);
        sorteioStore.salvarSorteio(guildId, id, sorteio);
        const canal = await client.channels.fetch(sorteio.canalId).catch(() => null);
        if (canal && canal.isTextBased() && sorteio.msgId) {


          const m = await canal.messages.fetch(sorteio.msgId).catch(() => null);
          if (m) {
            const { embed } = sorteioRender.montarEmbed(sorteio);
            await m.edit({ embeds: [embed], components: sorteioRender.montarComponentes(sorteio, sorteio.criadorId, guildId, id) });
          }
        }
        return interaction.reply({ content: '✅ Você está participando do sorteio!', flags: MessageFlags.Ephemeral });
      }

      if (interaction.isButton() && (interaction.customId.startsWith('sorteio:sortear:') || interaction.customId.startsWith('sorteio:refazer:'))) {
        const [, , uid, guildId, id] = interaction.customId.split(':');
        if (interaction.user.id !== uid && !comandoPode(interaction.member, interaction.user.id, 'sorteio')) {

          return interaction.reply({ content: '🔒 Somente o criador ou administradores podem sortear novamente.', flags: MessageFlags.Ephemeral });
        }
        await sorteioRender.sortearNovamente(client, guildId, id, uid);
        return interaction.reply({ content: '🔁 Novo vencedor sorteado!', flags: MessageFlags.Ephemeral });
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