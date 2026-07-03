export function setupEvents(client) {
  client.on('guildCreate', (guild) => {
    console.log(`[FiskBot] Entrou no servidor: ${guild.name} (${guild.id})`);
  });

  client.on('guildDelete', (guild) => {
    console.log(`[FiskBot] Removido do servidor: ${guild.name} (${guild.id})`);
  });

  client.on('error', (err) => {
    console.error('[Discord Error]', err);
  });
}
