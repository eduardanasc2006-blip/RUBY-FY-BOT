const fs = require('node:fs');
const { comandoPode } = require('../utils/permissions');
const path = require('node:path');
const { AttachmentBuilder } = require('discord.js');

module.exports = {
  name: 'backup',
  description: 'Envia na DM um backup das taxas e do estoque (restrito a administradores)',
  usage: '!backup',

  async execute(message) {
    if (!message.guild || !comandoPode(message.member, message.author.id, 'backup')) {
      return message.reply('🔒 Somente administradores podem usar este comando.');
    }

    const DATA = path.join(__dirname, '..', '..', 'data');
    const backup = {
      data: new Date().toLocaleString('pt-BR'),
      taxas: null,
      estoque: null,
    };
    try { backup.taxas = JSON.parse(fs.readFileSync(path.join(DATA, 'rates.json'), 'utf8')); } catch {}
    try { backup.estoque = JSON.parse(fs.readFileSync(path.join(DATA, 'estoque.json'), 'utf8')); } catch {}

    const arquivo = new AttachmentBuilder(
      Buffer.from(JSON.stringify(backup, null, 2)),
      { name: 'backup-ruby-fy.json' }
    );

    try {
      await message.author.send({
        content: '☁️ **Backup do RUBY FY BOT**\nGuarde este arquivo — ele contém suas taxas e seu estoque.',
        files: [arquivo],
      });
      return message.reply('✅ Backup enviado na sua DM!');
    } catch {
      return message.reply('❌ Não consegui te mandar DM. Ative "Permitir mensagens diretas" nas configurações de privacidade.');
    }
  },
};
