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
  const cmd = require(path.join(commandsPath, file)).data.toJSON();
  // Apenas Guild Install (0). Habilitar tambem User Install (1) faz o servidor
  // mostrar CADA comando DUPLICADO no seletor. Mantemos so o install no servidor.
  cmd.integration_types = [0];
  // 0 = Guild, 1 = Bot DM, 2 = DMs/grupos privados
  cmd.contexts = [0, 1, 2];
  commands.push(cmd);
}

// Inclui tambem os comandos personalizados salvos, para que o deploy nao os apague.
try {
  const custom = require('./src/utils/customCommands');
  for (const cmd of Object.values(custom.listar())) {
    commands.push({
      name: cmd.nome.toLowerCase(),
      description: (cmd.descricao || 'Comando personalizado').slice(0, 100),
      // Tambem aqui: so Guild Install, senao aparece duplicado no seletor.
      integration_types: [0],
      contexts: [0, 1, 2],
    });
  }
} catch (error) {
  console.warn('⚠️ Não foi possível carregar comandos personalizados:', error?.message || error);
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
