import { Events } from 'discord.js';

export default {
  name: Events.ClientReady,
  once: true,

  execute(client) {
    console.log(`[Bot] Online como ${client.user.tag}`);
    console.log(`[Bot] Servindo ${client.guilds.cache.size} servidor(es).`);
  },
};
