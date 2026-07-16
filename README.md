# RUBY-FY-BOT

Bot Discord construído com Discord.js v14 e ES Modules.

## Requisitos

- Node.js 18+
- npm

## Instalação

```bash
npm install
```

## Configuração

Copie o arquivo `.env.example` para `.env` e preencha as variáveis:

```bash
cp .env.example .env
```

| Variável         | Descrição                                    |
|------------------|----------------------------------------------|
| `DISCORD_TOKEN`  | Token do bot (Discord Developer Portal)      |
| `CLIENT_ID`      | ID da aplicação do bot                       |
| `GUILD_ID`       | ID do servidor de testes (deploy de comandos)|

## Iniciando

```bash
# Produção
npm start

# Desenvolvimento (reinicia ao salvar)
npm run dev
```

## Estrutura

```
src/
├── index.mjs          # Ponto de entrada — inicializa o client e os handlers
├── commands/          # Slash commands (organizados por categoria)
├── events/            # Eventos do Discord.js
│   ├── ready.mjs
│   └── interactionCreate.mjs
├── handlers/          # Carregadores automáticos de comandos e eventos
│   ├── commandHandler.mjs
│   └── eventHandler.mjs
├── config/            # Configurações globais do bot
│   └── bot.mjs
└── utils/             # Funções utilitárias reutilizáveis
    └── logger.mjs
```

## Adicionando comandos

Crie um arquivo `.mjs` dentro de `src/commands/` (pode organizar em subpastas):

```js
import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Responde com Pong!'),

  async execute(interaction) {
    await interaction.reply('Pong!');
  },
};
```

## Adicionando eventos

Crie um arquivo `.mjs` dentro de `src/events/`:

```js
import { Events } from 'discord.js';

export default {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    // lógica aqui
  },
};
```
