require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');

if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
  console.error('❌ Defina DISCORD_TOKEN e CLIENT_ID no arquivo .env antes de registrar os comandos.');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  commands.push(require(path.join(commandsPath, file)).data.toJSON());
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Registrando ${commands.length} comandos...`);
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('✅ Comandos registrados com sucesso!');
  } catch (error) {
    console.error(error);
  }
})();
