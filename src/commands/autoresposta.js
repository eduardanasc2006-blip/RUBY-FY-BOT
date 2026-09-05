const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const store = require('../utils/autoRespostaStore');

const MAX_AUTORESPOSTAS = 30;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autoresposta')
    .setDescription('Gerencia respostas automáticas por palavra-chave (admin)')
    .addSubcommand((s) =>
      s.setName('ver').setDescription('Lista as auto-respostas do servidor.')
    )
    .addSubcommand((s) =>
      s.setName('adicionar')
        .setDescription('Cria uma auto-resposta (ex: "quanto é 100 robux")')
        .addStringOption((o) => o.setName('palavra').setDescription('Palavra ou trecho que dispara a resposta (sem prefixo )').setRequired(true))
        .addStringOption((o) => o.setName('resposta').setDescription('O que o bot responde quando encontrar a palavra').setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('remover')
        .setDescription('Remove uma auto-resposta')
        .addStringOption((o) => o.setName('palavra').setDescription('Palavra da auto-resposta a remover').setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('canais')
        .setDescription('Define em quais canais as auto-respostas respondem')
        .addChannelOption((o) => o.setName('canal').setDescription('Canal (use várias vezes para vários; sem canal = responde em qualquer canal)').setRequired(false))
    ),

  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'gerenciarcomandos')) {

      return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'ver') {
      const lista = store.listar(interaction.guildId);
      const canaisIds = store.canais(interaction.guildId);
      const canaisTxt = canaisIds.length
        ? canaisIds.map((id) => `<#${id}>`).join(', ')
        : 'Todos os canais';
      const embed = new EmbedBuilder().setColor(0xbeb6ff).setDescription('**Canais:** ' + canaisTxt);
      if (!lista.length) {
        return interaction.reply({
          content: '📭 Nenhuma auto-resposta ainda. Use `/autoresposta adicionar`.',
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });
      }
      const linhas = lista.map((r, i) => '`' + (i + 1) + '`' + ' **' + r.palavra + '** → ' + r.resposta.slice(0, 60));
      return interaction.reply({
        content: '**Auto-respostas (' + lista.length + '):**\n' + linhas.join('\n'),
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (sub === 'adicionar') {
      const palavra = (interaction.options.getString('palavra') || '' ).trim();
      const resposta = (interaction.options.getString('resposta') || '' ).trim();
      if (!palavra || !resposta) {
        return interaction.reply({ content: '❌ Preencha palavra e resposta.', flags: MessageFlags.Ephemeral });
      }
      if (store.listar(interaction.guildId).length >= MAX_AUTORESPOSTAS) {

        return interaction.reply({ content: `❌ Máximo de ${MAX_AUTORESPOSTAS} auto-respostas por servidor.`, flags: MessageFlags.Ephemeral });
      }
      const res = store.adicionar(interaction.guildId, palavra, resposta);
      return interaction.reply({ content: res.ok ? '✅ ' + res.msg : '❌ ' + res.msg, flags: MessageFlags.Ephemeral });
    }

    if (sub === 'remover') {
      const palavra = (interaction.options.getString('palavra') || '' ).trim();
      if (!palavra) return interaction.reply({ content: '❌ Informe a palavra.', flags: MessageFlags.Ephemeral });
      const res = store.remover(interaction.guildId, palavra);
      return interaction.reply({ content: res.ok ? '✅ ' + res.msg : '❌ ' + res.msg, flags: MessageFlags.Ephemeral });
    }

    if (sub === 'canais') {
      const canal = interaction.options.getChannel('canal');
      const atuais = store.canais(interaction.guildId);
      if (!canal) {
        // Sem canal → limpa a lista e volta a responder em qualquer canal.



        store.definirCanais(interaction.guildId, []);
        return interaction.reply({ content: '✅ Agora responde em **qualquer canal** do servidor.', flags: MessageFlags.Ephemeral });
      }
      if (!canal.isTextBased() || !canal.isSendable?.()) {
        return interaction.reply({ content: '❌ Use um canal de texto.', flags: MessageFlags.Ephemeral });
      }
      if (atuais.includes(canal.id)) {
        // Ja esta na lista: remove (toggle)
        const nova = atuais.filter((id) => id !== canal.id);
        store.definirCanais(interaction.guildId, nova);
        return interaction.reply({ content: `🚫 Removido ${canal}.` + (nova.length ? '' : ' Agora responde em qualquer canal.'), flags: MessageFlags.Ephemeral });
      }
      const nova = [...atuais, canal.id];
      store.definirCanais(interaction.guildId, nova);
      return interaction.reply({ content: `✅ Adicionado ${canal}.` + (nova.length === 1 ? ' Agora responde **somente** neste canal.' : ''), flags: MessageFlags.Ephemeral });
    }

    return interaction.reply({ content: '❌ Subcomando inválido.', flags: MessageFlags.Ephemeral });
  },
};