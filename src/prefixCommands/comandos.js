const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'comandos',
  aliases: ['ajuda', 'help', 'menu'],
  description: 'Mostra o menu com todos os comandos do bot',
  usage: '!comandos',

  async execute(message, args, client) {
    const vistos = new Set();
    const linhas = [];
    for (const cmd of client.prefixCommands.values()) {
      if (vistos.has(cmd.name)) continue;
      vistos.add(cmd.name);
      linhas.push(`\`${cmd.usage}\` — ${cmd.description}`);
    }

    const embed = new EmbedBuilder()
      .setColor(0xeb459e)
      .setTitle('📜 Menu de Comandos')
      .setDescription(
        'Use os comandos com o prefixo `!` ou com `/`:\n\n' + linhas.join('\n')
      )
      .setFooter({ text: 'RUBY-FY • Conversor de Robux' });

    return message.reply({ embeds: [embed] });
  },
};
