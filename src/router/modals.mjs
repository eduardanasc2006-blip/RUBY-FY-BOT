export function setupModals(client) {
  client.on('interactionCreate', async interaction => {
    if (!interaction.isModalSubmit()) return;
    const [sistema, acao, ...dados] = interaction.customId.split(':');
    // TODO: mapear handlers de modais por sistema
  });
}
