const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { comandoPode } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Envia na DM um backup das taxas e do estoque (admin)'),

  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'backup')) {
      return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
    }

    const fs = require('node:fs');
    const path = require('node:path');
    const { AttachmentBuilder } = require('discord.js');
    const DATA = path.join(__dirname, '..', '..', 'data');
    const backup = { data: new Date().toLocaleString('pt-BR'), taxas: null, estoque: null };
    try { backup.taxas = JSON.parse(fs.readFileSync(path.join(DATA, 'rates.json'), 'utf8')); } catch {}
    try { backup.estoque = JSON.parse(fs.readFileSync(path.join(DATA, 'estoque.json'), 'utf8')); } catch {}

    const arquivo = new AttachmentBuilder(Buffer.from(JSON.stringify(backup, null, 2)), { name: 'backup-ruby-fy.json' });

    try {
      await interaction.user.send({
        content: '☁️ **Backup do RUBY FY BOT**\nGuarde este arquivo — ele contém suas taxas e seu estoque.',
        files: [arquivo],
      });
      return interaction.reply({ content: '✅ Backup enviado na sua DM!', flags: MessageFlags.Ephemeral });
    } catch {
      return interaction.reply({ content: '❌ Não consegui te mandar DM. Ative "Permitir mensagens diretas".', flags: MessageFlags.Ephemeral });
    }
  },
};
