# 💎 RUBY-FY BOT

Bot de Discord simples para conversão de Robux ↔ Reais e cálculo de Game Pass.

## Comandos

Todos os comandos funcionam com **prefixo `!`** e também como **slash command `/`**:

| Comando | Descrição |
| --- | --- |
| `!robux <quantidade>` ou `/robux` | Converte Robux para R$ |
| `!reais <valor>` ou `/reais` | Converte R$ para Robux |
| `!gamepass <robux>` ou `/gamepass` | Quanto colocar no Game Pass para receber X Robux (Roblox desconta 30%) |
| `!taxa` ou `/taxa` | Mostra as taxas atuais |
| `!comandos` ou `/comandos` | Menu com todos os comandos |

## Taxas

As taxas ficam em **um único arquivo**: `src/config/rates.js`

- **100–999 Robux** → R$ 3,80 a cada 100 Robux
- **1.000+ Robux** → R$ 37,99 a cada 1.000 Robux
- **Game Pass** → 30% de desconto (você recebe 70%)

Para alterar, edite apenas o `rates.js` — todo o bot se ajusta automaticamente.

## Configuração

1. Instale as dependências: `npm install`

2. Crie um arquivo `.env` baseado no `.env.example`:

   `DISCORD_TOKEN` = token do seu bot
   `CLIENT_ID` = ID do aplicativo
   `ADMIN_IDS` = (opcional) IDs de usuários administradores, separados por vírgula

3. Registre os comandos (só precisa rodar quando criar ou alterar comandos): `npm run deploy`

   Comandos globais podem levar até 1 hora para aparecer no Discord.


    **Usar o bot na DM?** Os comandos públicos (`/ajuda`, `/estoque`, `/gamepass`, `/reais`, `/robux`, `/taxa`) são registrados como **User Install** — funcionam no servidor e também na **DM** do bot. Para que apareçam na sua DM:
    - Rode `npm run deploy` depois de atualizar o código (é isso que mantém os `/` disponíveis na DM).
    - No Developer Portal → **General** → **Installation** → marque também **User Install** (sem isso os `/` não aparecem na DM).
    - O app precisa ter DM habilitada: **Bot** → **Public Bot** ligado e **Allow Direct Messages** ligado.
    - Use o link de instalação **User Install** para adicionar o bot à sua conta e liberar os comandos na DM:
      `https://discord.com/oauth2/authorize?client_id=SEU_CLIENT_ID&scope=applications.commands&integration_type=1`
      (troque `SEU_CLIENT_ID` pelo seu Client ID, ex: `https://discord.com/oauth2/authorize?client_id=1509146932478476389&scope=applications.commands&integration_type=1`)
    - Na DM, os comandos de **administração** ficam ocultos para quem não é admin (o menu de ajuda mostra apenas o que você pode usar).


4. Inicie o bot: `npm start`

## Discloud

O bot já vem com `discloud.config` configurado. Envie o projeto (zip sem `node_modules` e sem `.env`) e configure o `DISCORD_TOKEN` nas variáveis de ambiente do painel.

Comando de inicialização: `node src/index.js`

## Estrutura

```
src/
├── config/
│   └── rates.js          ← taxas (edite aqui)
├── commands/             ← slash commands (/)
│   ├── robux.js
│   ├── reais.js
│   ├── gamepass.js
│   ├── taxa.js
│   └── comandos.js
├── prefixCommands/       ← comandos com prefixo (!)
│   ├── robux.js
│   ├── reais.js
│   ├── gamepass.js
│   ├── taxa.js
│   └── comandos.js
├── utils/
│   └── robuxConverter.js ← cálculos
└── index.js              ← entrada do bot
```

> **Importante (comandos com `!`):** para o bot ler mensagens, ative o **Message Content Intent** no [Discord Developer Portal](https://discord.com/developers/applications) → sua aplicação → **Bot** → ligue **Message Content Intent**. Sem isso, os comandos `!` não respondem (os `/` continuam funcionando).
