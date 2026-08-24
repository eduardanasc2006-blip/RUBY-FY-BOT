require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');

if (!process.env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN não definido. Crie um arquivo .env baseado no .env.example.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    const mensagem = { content: '❌ Ocorreu um erro ao executar este comando.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(mensagem);
    } else {
      await interaction.reply(mensagem);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
