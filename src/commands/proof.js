const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const proofStore = require('../utils/proofStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('proof')
    .setDescription('Posta o comprovante (proof) manual no canal de proofs (admin)')
    .addIntegerOption((o) =>
      o.setName('numero').setDescription('Número do proof (ex: 25)').setRequired(true).setMinValue(0)
    )
    .addStringOption((o) =>
      o.setName('produto').setDescription('Produto/Item do pedido').setRequired(false)
    )
    .addUserOption((o) =>
      o.setName('cliente').setDescription('Cliente do pedido (membro do servidor)').setRequired(false)
    )
    .addStringOption((o) =>
      o.setName('valor').setDescription('Valor do pedido (ex: 3,00)').setRequired(false)
    )
    // Discord permite no máximo 5 anexos por comando: múltiplas opções de imagem
    .addAttachmentOption((o) => o.setName('imagem1').setDescription('Imagem do comprovante (1)').setRequired(false))
    .addAttachmentOption((o) => o.setName('imagem2').setDescription('Imagem do comprovante (2)').setRequired(false))
    .addAttachmentOption((o) => o.setName('imagem3').setDescription('Imagem do comprovante (3)').setRequired(false))
    .addAttachmentOption((o) => o.setName('imagem4').setDescription('Imagem do comprovante (4)').setRequired(false))
    .addAttachmentOption((o) => o.setName('imagem5').setDescription('Imagem do comprovante (5)').setRequired(false)),

  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'comprar')) {
      return interaction.reply({ content: '🔒 Somente administradores ou equipe autorizada.', flags: MessageFlags.Ephemeral });
    }

    const guildId = interaction.guildId;
    const canalId = proofStore.obter(guildId);
    if (!canalId) {
      return interaction.reply({
        content: '❌ Nenhum canal de proofs configurado neste servidor. Use `/setproof #canal` primeiro.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const numero = interaction.options.getInteger('numero');
    const produto = interaction.options.getString('produto');
    const clienteUser = interaction.options.getUser('cliente');
    const valorRaw = interaction.options.getString('valor');

    // Coleta todas as imagens enviadas (imagem1..imagem5)
    const imagens = [];
    for (let i = 1; i <= 5; i++) {
      const anexo = interaction.options.getAttachment(`imagem${i}`);
      if (anexo) imagens.push(anexo);
    }

    if (!imagens.length) {
      return interaction.reply({
        content: '❌ Anexe pelo menos 1 imagem (imagem1) para postar o proof.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // Monta o texto manual no formato aprovado (sem embed)
    const linhas = [];
    if (produto) linhas.push(`📦 Produto: ${produto}`);
    if (clienteUser) linhas.push(`👤 Cliente: <@${clienteUser.id}> (\`${clienteUser.id}\`)`);
    if (valorRaw) {
      const v = valorRaw.trim();
      linhas.push(`💰 Valor: ${v.toLowerCase().startsWith('r$') ? v : 'R$ ' + v}`);
    }
    const content = `# PROOF #${numero}${linhas.length ? '\n\n' + linhas.join('\n') : ''}`;

    const canal = await interaction.client.channels.fetch(canalId);
    if (!canal || !canal.isTextBased()) {
      return interaction.reply({ content: '❌ Canal de proofs inválido. Reconfigure com `/setproof`.', flags: MessageFlags.Ephemeral });
    }

    const files = imagens.map((a, i) => ({ attachment: a.url, name: `proof-${numero}-${i + 1}.png` }));
    await canal.send({ content, files, allowedMentions: { parse: [] } });

    return interaction.reply({
      content: `✅ Proof **#${numero}** postado em <#${canalId}> com **${imagens.length} imagem(ns)**.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};