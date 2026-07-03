export function setupButtons(client) {
  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    // Roteamento de botões — customId: 'sistema:acao:dados'
    const [sistema, acao, ...dados] = interaction.customId.split(':');
    // TODO: mapear handlers de botões por sistema
  });
}
