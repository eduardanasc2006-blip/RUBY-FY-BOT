module.exports = {
  name: 'ping',
  description: 'Testa a latência do bot.',
  usage: '!ping',

  async execute(message) {
    const api = Math.round(message.client.ws.ping);
    const bot = Date.now() - message.createdTimestamp;
    return message.reply({
      content: `🏓 Pong!\n➜ Latência do bot: **${bot}ms**\n➜ API: **${api}ms**`,
    });
  },
};