const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../prefixCommands/settaxa');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rolegive')
    .setDescription('Dá um cargo a um membro do servidor (admin)')
    .addRoleOption((o) => o.setName('cargo').setDescription('Cargo a dar').setRequired(true))
    .addUserOption((o) => o.setName('usuario').setDescription('Membro que vai receber o cargo').setRequired(true)),

  async execute(interaction) {
    if (!interaction.guild || !isAdmin(interaction.member, interaction.user.id)) {
      return interaction.reply({ content: '🔒 Somente administradores podem usar este comando.', flags: MessageFlags.Ephemeral });
    }

    const cargo = interaction.options.getRole('cargo');
    const usuario = interaction.options.getMember('usuario');

    if (!usuario) {
      return interaction.reply({ content: '❌ Usuário não encontrado no servidor.', flags: MessageFlags.Ephemeral });
    }

    if (cargo.managed) {
      return interaction.reply({ content: '❌ Esse cargo é gerenciado por um bot/integração e não pode ser dado manualmente.', flags: MessageFlags.Ephemeral });
    }

    // O membro do bot pode não estar no cache (null) logo após entrar no servidor.
    // Nesse caso, busca explicitamente. Nenhum problema aqui quebra o comando.
    let posicaoBot = -1;
    try {
      const botMembro =
        interaction.guild.members.me ??
        (await interaction.guild.members.fetch(interaction.client.user.id).catch(() => null));
      posicaoBot = botMembro ? botMembro.roles.highest.position : -1;
    } catch {}

    if (posicaoBot >= 0 && cargo.position >= posicaoBot) {
      return interaction.reply({ content: '❌ Esse cargo está acima do meu cargo mais alto. Suba meu cargo na hierarquia do servidor.', flags: MessageFlags.Ephemeral });
    }

    if (usuario.roles.cache.has(cargo.id)) {
      return interaction.reply({ content: `ℹ️ ${usuario} já tem o cargo ${cargo}.`, flags: MessageFlags.Ephemeral });
    }

    try {
      await usuario.roles.add(cargo);
      return interaction.reply({ content: `✅ Cargo ${cargo} dado para ${usuario}!`, flags: MessageFlags.Ephemeral });
    } catch {
      return interaction.reply({ content: '❌ Não consegui dar o cargo. Verifique minhas permissões.', flags: MessageFlags.Ephemeral });
    }
  },
};
