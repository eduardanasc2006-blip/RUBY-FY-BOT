function formatoUptime(segundos) {
  const d = Math.floor(segundos / 86400);
  const h = Math.floor((segundos % 86400) / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = Math.floor(segundos % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

module.exports = {
  name: 'info',
  description: 'Mostra informações básicas do bot.',
  usage: '!info',

  async execute(message) {
    const totalUsuarios = message.client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);
    return message.reply({
      embeds: [{
        color: 0xbeb6ff,
        title: '🤖 RUBY FY BOT',
        fields: [
          { name: '➜ Versão', value: '2.0.0', inline: true },
          { name: '➜ Servidores', value: String(message.client.guilds.cache.size), inline: true },
          { name: '➜ Usuários', value: String(totalUsuarios), inline: true },
          { name: '➜ Latência', value: `${Math.round(message.client.ws.ping)}ms`, inline: true },
          { name: '➜ Uptime', value: formatoUptime(process.uptime()), inline: true },
        ],
      }],
    });
  },
};