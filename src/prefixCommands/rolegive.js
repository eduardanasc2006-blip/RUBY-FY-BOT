const { comandoPode } = require('../utils/permissions');

module.exports = {
  name: 'rolegive',
  description: 'Dá um cargo a um membro do servidor (restrito a administradores)',
  usage: '!rolegive <@cargo> <@usuario>',

  async execute(message, args) {
    if (!message.guild || !comandoPode(message.member, message.author.id, 'rolegive')) {
      return message.reply('🔒 Somente administradores podem usar este comando.');
    }

    const cargo = message.mentions?.roles?.first();
    const usuario = message.mentions?.users?.first();

    if (!cargo || !usuario) {
      return message.reply(
        '❌ Use: `!rolegive <@cargo> <@usuario>` — exemplos:\n' +
        '`!rolegive @VIP @usuario`\n' +
        'Ou use **/rolegive** com os menus de cargo e usuário.'
      );
    }

    // O membro de destino pode não estar no cache; busca explicitamente se preciso.
    const membro = message.guild.members.cache.get(usuario.id) || await message.guild.members.fetch(usuario.id).catch(() => null);
    if (!membro) {
      return message.reply('❌ Usuário não encontrado no servidor.');
    }

    if (cargo.managed) {
      return message.reply('❌ Esse cargo é gerenciado por um bot/integração e não pode ser dado manualmente.');
    }

    // O membro do bot pode não estar no cache (null) logo após entrar no servidor.

    // Nesse caso, busca explicitamente. Nenhum problema aqui quebra o comando.
    let posicaoBot = -1;
    try {
      const botMembro =
        message.guild.members.me ??
        (await message.guild.members.fetch(message.client.user.id).catch(() => null));
      posicaoBot = botMembro ? botMembro.roles.highest.position : -1;
    } catch {}

    if (posicaoBot >= 0 && cargo.position >= posicaoBot) {

      return message.reply('❌ Esse cargo está acima do meu cargo mais alto. Suba meu cargo na hierarquia do servidor.');
    }

    if (membro.roles.cache.has(cargo.id)) {

      return message.reply(`ℹ️ ${membro} já tem o cargo ${cargo}.`);
    }

    try {
      await membro.roles.add(cargo);
      return message.reply(`✅ Cargo ${cargo} dado para ${membro}!`);
    } catch {
      return message.reply('❌ Não consegui dar o cargo. Verifique minhas permissões.');
    }
  },
};