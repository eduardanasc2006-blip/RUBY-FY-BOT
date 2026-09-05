const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const store = require('../utils/autoRespostaStore');

const MAX_AUTORESPOSTAS = 30;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autoresposta')
    .setDescription('Gerencia respostas automáticas por palavra-chave (admin)')
    .addSubcommand((sub) =>
      sub.setName('adicionar')
        .setDescription('Cria uma resposta automática por palavra')
        .addStringOption((o) => o.setName('palavra').setDescription('Palavra que dispara a resposta').setRequired(true))
        .addStringOption((o) => o.setName('resposta').setDescription('Mensagem que o bot vai responder').setRequired(true)))
    .addSubcommand((sub) =>
      sub.setName('ver')
        .setDescription('Lista as respostas automáticas e canais atuais'))
    .addSubcommand((sub) =>
      sub.setName('remover')
        .setDescription('Remove uma resposta automática')
        .addStringOption((o) => o.setName('palavra').setDescription('Palavra da resposta a remover').setRequired(true)))
    .addSubcommand((sub) =>
      sub.setName('canais')
        .setDescription('Restringe ou mostra os canais onde responde')
        .addChannelOption((o) => o.setName('canal').setDescription('Canal a adicionar/remover da lista (opcional)').setRequired(false))
        .addBooleanOption((o) => o.setName('limpar').setDescription('true = volta a responder em qualquer canal').setRequired(false))),

  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'autoresposta')) {

      return interaction.reply({ content: '🔒 Somente administradores podem usar este comando.', flags: MessageFlags.Ephemeral });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'adicionar') {
      const palavra = interaction.options.getString('palavra').trim();
      const resposta = interaction.options.getString('resposta').trim();
      if (!palavra || !resposta) return interaction.reply({ content: '❌ Informe palavra e resposta.', flags: MessageFlags.Ephemeral });
      if (store.listar(interaction.guildId).length >= MAX_AUTORESPOSTAS) {

        return interaction.reply({ content: `❌ Máximo de ${MAX_AUTORESPOSTAS} auto-respostas por servidor.`, flags: MessageFlags.Ephemeral });
      }
      const res = store.adicionar(interaction.guildId, palavra, resposta);
      return interaction.reply({ content: res.ok ? `✅ ${res.msg}` : `❌ ${res.msg}`, flags: MessageFlags.Ephemeral });
    }

    if (sub === 'remover') {
      const palavra = interaction.options.getString('palavra').trim();
      const res = store.remover(interaction.guildId, palavra);
      return interaction.reply({ content: res.ok ? `✅ ${res.msg}` : `❌ ${res.msg}`, flags: MessageFlags.Ephemeral });
    }

    if (sub === 'canais') {
      const canal = interaction.options.getChannel('canal');
      const limpar = interaction.options.getBoolean('limpar') ?? false;
      const atuais = store.canais(interaction.guildId);
      if (limpar) {
        store.definirCanais(interaction.guildId, []);
        return interaction.reply({ content: '✅ Agora responde em **qualquer canal** do servidor.', flags: MessageFlags.Ephemeral });
      }
      if (!canal) {
        const txtCanais = atuais.length
          ? atuais.map((id) => '<#' + id + '>').join(', ')
          : 'todos os canais';
        const dica = atuais.length
          ? 'Use `/autoresposta canais canal:<#canal>` para adicionar/remover, ou `limpar:true` para voltar a qualquer canal.'
          : 'Sem restrição até agora. Use `/autoresposta canais canal:<#canal>` para restringir a um canal.';
        return interaction.reply({ content: '📌 **Canais atuais:** ' + txtCanais + '\n' + dica, flags: MessageFlags.Ephemeral });
      }
      if (atuais.includes(canal.id)) {
        const nova = atuais.filter((id) => id !== canal.id);
        store.definirCanais(interaction.guildId, nova);
        return interaction.reply({ content: '🚫 Removido ' + canal + (nova.length ? '' : ' Agora responde em qualquer canal.'), flags: MessageFlags.Ephemeral });
      }
      const nova = [...atuais, canal.id];
      store.definirCanais(interaction.guildId, nova);
      return interaction.reply({ content: '✅ Adicionado ' + canal + (nova.length === 1 ? ' Agora responde **somente** neste canal.' : ''), flags: MessageFlags.Ephemeral });
    }

    const lista = store.listar(interaction.guildId);
    const canaisIds = store.canais(interaction.guildId);
    const canaisTxt = canaisIds.length
      ? canaisIds.map((id) => '<#' + id + '>').join(', ')
      : 'todos os canais';
    if (!lista.length) {
      return interaction.reply({ content: '📭 Nenhuma auto-resposta ainda.\n**Canais:** ' + canaisTxt + '\nUse `/autoresposta adicionar palavra:<palavra> resposta:<resposta>`.' , flags: MessageFlags.Ephemeral });
    }
    const linhas = lista.map((r, i) => '`' + (i + 1) + '` **' + r.palavra + '** → ' + r.resposta);
    return interaction.reply({ content: '**Auto-respostas (' + lista.length + '):**\n' + linhas.join('\n') + '\n**Canais:** ' + canaisTxt, flags: MessageFlags.Ephemeral });
  },
};
