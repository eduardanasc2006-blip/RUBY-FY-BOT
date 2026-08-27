require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');

if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
  console.error('❌ Defina DISCORD_TOKEN e CLIENT_ID no arquivo .env antes de registrar os comandos.');
  process.exit(1);
}

// Comandos públicos (não admin): disponíveis também como "User Install" ([1]).
// É isso que permite usá-los na DM (/, não só !). Contextos: 0 guild, 1 DM,
// 2 grupos. Comandos admin ficam só no servidor (Guild Install) por segurança.
const PUBLICOS = new Set([
  'ajuda', 'estoque', 'gamepass', 'reais', 'robux', 'taxa',
]);

const commands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const cmd = require(path.join(commandsPath, file)).data.toJSON();
  cmd.integration_types = PUBLICOS.has(cmd.name) ? [0, 1] : [0];
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
      // Comando personalizado: só no servidor, para não expor na DM.
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
