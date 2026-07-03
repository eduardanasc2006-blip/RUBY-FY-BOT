export function setupAutocomplete(client) {
  client.on('interactionCreate', async interaction => {
    if (!interaction.isAutocomplete()) return;
    // TODO: mapear handlers de autocomplete por sistema
  });
}
