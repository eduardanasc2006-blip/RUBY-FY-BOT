export function setupSelects(client) {
  client.on('interactionCreate', async interaction => {
    if (!interaction.isAnySelectMenu()) return;
    const [sistema, acao, ...dados] = interaction.customId.split(':');
    // TODO: mapear handlers de selects por sistema
  });
}
